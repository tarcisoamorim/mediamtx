package main

import (
    "fmt"
    "io"
    "log"
    "net/http"
    "os"
    "strings"
)

func do() error {
    buf, err := os.ReadFile("./mtxrpicamdownloader/VERSION")
    if err != nil {
        return err
    }

    // Limpar a versão de qualquer caractere especial ou espaço
    version := strings.TrimSpace(string(buf))
    url := fmt.Sprintf("https://github.com/bluenviron/mediamtx-rpicamera/releases/download/%s/mediamtx-rpicamera-linux-arm64", version)
    
    resp, err := http.Get(url)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    f, err := os.Create("component")
    if err != nil {
        return err
    }
    defer f.Close()

    _, err = io.Copy(f, resp.Body)
    return err
}

func main() {
    err := do()
    if err != nil {
        log.Fatal("ERR: ", err)
    }
    log.Println("ok")
}
