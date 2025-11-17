package core

import (
	"github.com/tarcisoamorim/peep-mediaserver/internal/defs"
	"github.com/tarcisoamorim/peep-mediaserver/internal/logger"
)

// sourceRedirect is a source that redirects to another one.
type sourceRedirect struct{}

func (*sourceRedirect) Log(logger.Level, string, ...any) {
}

// APISourceDescribe implements source.
func (*sourceRedirect) APISourceDescribe() defs.APIPathSourceOrReader {
	return defs.APIPathSourceOrReader{
		Type: "redirect",
		ID:   "",
	}
}
