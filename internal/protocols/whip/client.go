// Package whip contains a WHIP/WHEP client.
package whip

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/pion/sdp/v3"
	pwebrtc "github.com/pion/webrtc/v4"

	"github.com/tarcisoamorim/mediamtx/internal/conf"
	"github.com/tarcisoamorim/mediamtx/internal/logger"
	"github.com/tarcisoamorim/mediamtx/internal/protocols/httpp"
	"github.com/tarcisoamorim/mediamtx/internal/protocols/webrtc"
)

const (
	handshakeTimeout   = 10 * time.Second
	trackGatherTimeout = 2 * time.Second
)

// Client is a WHIP client.
type Client struct {
	HTTPClient *http.Client
	URL        *url.URL
	Log        logger.Writer

	pc               *webrtc.PeerConnection
	patchIsSupported bool
}

// Publish publishes tracks.
func (c *Client) Publish(
	ctx context.Context,
	outgoingTracks []*webrtc.OutgoingTrack,
) error {
	iceServers, err := c.optionsICEServers(ctx)
	if err != nil {
		return err
	}

	c.pc = &webrtc.PeerConnection{
		ICEServers:         iceServers,
		HandshakeTimeout:   conf.Duration(10 * time.Second),
		TrackGatherTimeout: conf.Duration(2 * time.Second),
		LocalRandomUDP:     true,
		IPsFromInterfaces:  true,
		Publish:            true,
		OutgoingTracks:     outgoingTracks,
		Log:                c.Log,
	}
	err = c.pc.Start()
	if err != nil {
		return err
	}

	offer, err := c.pc.CreatePartialOffer()
	if err != nil {
		c.pc.Close()
		return err
	}

	res, err := c.postOffer(ctx, offer)
	if err != nil {
		c.pc.Close()
		return err
	}

	c.URL, err = c.URL.Parse(res.Location)
	if err != nil {
		c.pc.Close()
		return err
	}

	err = c.pc.SetAnswer(res.Answer)
	if err != nil {
		c.deleteSession(context.Background()) //nolint:errcheck
		c.pc.Close()
		return err
	}

	t := time.NewTimer(handshakeTimeout)
	defer t.Stop()

outer:
	for {
		select {
		case ca := <-c.pc.NewLocalCandidate():
			err := c.patchCandidate(ctx, offer, res.ETag, ca)
			if err != nil {
				c.deleteSession(context.Background()) //nolint:errcheck
				c.pc.Close()
				return err
			}

		case <-c.pc.GatheringDone():

		case <-c.pc.Ready():
			break outer

		case <-t.C:
			c.deleteSession(context.Background()) //nolint:errcheck
			c.pc.Close()
			return fmt.Errorf("deadline exceeded while waiting connection")
		}
	}

	return nil
}

// Read reads tracks.
func (c *Client) Read(ctx context.Context) ([]*webrtc.IncomingTrack, error) {
	iceServers, err := c.optionsICEServers(ctx)
	if err != nil {
		return nil, err
	}

	c.pc = &webrtc.PeerConnection{
		ICEServers:         iceServers,
		HandshakeTimeout:   conf.Duration(10 * time.Second),
		TrackGatherTimeout: conf.Duration(2 * time.Second),
		LocalRandomUDP:     true,
		IPsFromInterfaces:  true,
		Publish:            false,
		Log:                c.Log,
	}
	err = c.pc.Start()
	if err != nil {
		return nil, err
	}

	offer, err := c.pc.CreatePartialOffer()
	if err != nil {
		c.pc.Close()
		return nil, err
	}

	res, err := c.postOffer(ctx, offer)
	if err != nil {
		c.pc.Close()
		return nil, err
	}

	c.URL, err = c.URL.Parse(res.Location)
	if err != nil {
		c.pc.Close()
		return nil, err
	}

	var sdp sdp.SessionDescription
	err = sdp.Unmarshal([]byte(res.Answer.SDP))
	if err != nil {
		c.deleteSession(context.Background()) //nolint:errcheck
		c.pc.Close()
		return nil, err
	}

	err = webrtc.TracksAreValid(sdp.MediaDescriptions)
	if err != nil {
		c.deleteSession(context.Background()) //nolint:errcheck
		c.pc.Close()
		return nil, err
	}

	err = c.pc.SetAnswer(res.Answer)
	if err != nil {
		c.deleteSession(context.Background()) //nolint:errcheck
		c.pc.Close()
		return nil, err
	}

	t := time.NewTimer(handshakeTimeout)
	defer t.Stop()

outer:
	for {
		select {
		case ca := <-c.pc.NewLocalCandidate():
			err = c.patchCandidate(ctx, offer, res.ETag, ca)
			if err != nil {
				c.deleteSession(context.Background()) //nolint:errcheck
				c.pc.Close()
				return nil, err
			}

		case <-c.pc.GatheringDone():

		case <-c.pc.Ready():
			break outer

		case <-t.C:
			c.deleteSession(context.Background()) //nolint:errcheck
			c.pc.Close()
			return nil, fmt.Errorf("deadline exceeded while waiting connection")
		}
	}

	tracks, err := c.pc.GatherIncomingTracks(ctx)
	if err != nil {
		c.deleteSession(context.Background()) //nolint:errcheck
		c.pc.Close()
		return nil, err
	}

	return tracks, nil
}

// PeerConnection returns the underlying peer connection.
func (c *Client) PeerConnection() *webrtc.PeerConnection {
	return c.pc
}

// StartReading starts reading all incoming tracks.
func (c *Client) StartReading() {
	c.pc.StartReading()
}

// Close closes the client.
func (c *Client) Close() error {
	err := c.deleteSession(context.Background())
	c.pc.Close()
	return err
}

// Wait waits for client errors.
func (c *Client) Wait(ctx context.Context) error {
	select {
	case <-c.pc.Failed():
		return fmt.Errorf("peer connection closed")

	case <-ctx.Done():
		return fmt.Errorf("terminated")
	}
}

func (c *Client) optionsICEServers(
	ctx context.Context,
) ([]pwebrtc.ICEServer, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodOptions, c.URL.String(), nil)
	if err != nil {
		return nil, err
	}

	res, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK && res.StatusCode != http.StatusNoContent {
		return nil, fmt.Errorf("bad status code: %v", res.StatusCode)
	}

	return LinkHeaderUnmarshal(res.Header["Link"])
}

type whipPostOfferResponse struct {
	Answer   *pwebrtc.SessionDescription
	Location string
	ETag     string
}

func (c *Client) postOffer(
	ctx context.Context,
	offer *pwebrtc.SessionDescription,
) (*whipPostOfferResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.URL.String(), bytes.NewReader([]byte(offer.SDP)))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/sdp")

	res, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("bad status code: %v", res.StatusCode)
	}

	contentType := httpp.ParseContentType(req.Header.Get("Content-Type"))
	if contentType != "application/sdp" {
		return nil, fmt.Errorf("bad Content-Type: expected 'application/sdp', got '%s'", contentType)
	}

	c.patchIsSupported = (res.Header.Get("Accept-Patch") == "application/trickle-ice-sdpfrag")

	Location := res.Header.Get("Location")

	etag := res.Header.Get("ETag")
	if etag == "" {
		return nil, fmt.Errorf("ETag is missing")
	}

	sdp, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	answer := &pwebrtc.SessionDescription{
		Type: pwebrtc.SDPTypeAnswer,
		SDP:  string(sdp),
	}

	return &whipPostOfferResponse{
		Answer:   answer,
		Location: Location,
		ETag:     etag,
	}, nil
}

func (c *Client) patchCandidate(
	ctx context.Context,
	offer *pwebrtc.SessionDescription,
	etag string,
	candidate *pwebrtc.ICECandidateInit,
) error {
	if !c.patchIsSupported {
		return nil
	}

	frag, err := ICEFragmentMarshal(offer.SDP, []*pwebrtc.ICECandidateInit{candidate})
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPatch, c.URL.String(), bytes.NewReader(frag))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/trickle-ice-sdpfrag")
	req.Header.Set("If-Match", etag)

	res, err := c.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusNoContent {
		return fmt.Errorf("bad status code: %v", res.StatusCode)
	}

	return nil
}

func (c *Client) deleteSession(
	ctx context.Context,
) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, c.URL.String(), nil)
	if err != nil {
		return err
	}

	res, err := c.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status code: %v", res.StatusCode)
	}

	return nil
}
