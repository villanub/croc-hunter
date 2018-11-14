// The infamous "croc-hunter" game as featured at many a demo
package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	newrelic "github.com/newrelic/go-agent"
	git "gopkg.in/src-d/go-git.v4"
	"gopkg.in/src-d/go-git.v4/storage/memory"
)

var (
	app newrelic.Application
)

func main() {
	config := newrelic.NewConfig("Croc-Hunter", "ef9a08cf2cf2f84dfd405242b5fdb5d2bdb7af79")
	config.Logger = newrelic.NewDebugLogger(os.Stdout)

	var err error
	app, err = newrelic.NewApplication(config)
	if nil != err {
		fmt.Println(err)
		os.Exit(1)
	}

	// Clones the given repository in memory, creating the remote, the local
	// branches and fetching the objects, exactly as:
	//Info("git clone https://github.com/villanub/croc-hunter.git")

	r, err := git.Clone(memory.NewStorage(), nil, &git.CloneOptions{
		URL: "https://github.com/villanub/croc-hunter.git",

		ReferenceName: "refs/heads/Dev",
	})

	//CheckIfError(err)

	// Getting the latest commit on the current branch
	//Info("git log -1")

	// ... retrieving the branch being pointed by HEAD
	ref, err := r.Head()
	//CheckIfError(err)

	Info("Test from Here")
	// ... retrieving the commit object
	commit, err := r.CommitObject(ref.Hash())
	//CheckIfError(err)
	fmt.Println(commit.Hash)

	httpListenAddr := flag.String("port", "8080", "HTTP Listen address.")

	flag.Parse()

	log.Println("Starting server...")

	// point / at the handler function
	http.HandleFunc(newrelic.WrapHandleFunc(app, "/", handler))

	// serve static content from /static
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static/"))))

	log.Println("Server started. Listening on port " + *httpListenAddr)
	log.Fatal(http.ListenAndServe(":"+*httpListenAddr, nil))

}

// CheckArgs should be used to ensure the right command line arguments are
// passed before executing an example.
func CheckArgs(arg ...string) {
	if len(os.Args) < len(arg)+1 {
		Warning("Usage: %s %s", os.Args[0], strings.Join(arg, " "))
		os.Exit(1)
	}
}

// CheckIfError should be used to naively panics if an error is not nil.
func CheckIfError(err error) {
	if err == nil {
		return
	}

	fmt.Printf("\x1b[31;1m%s\x1b[0m\n", fmt.Sprintf("error: %s", err))
	os.Exit(1)
}

// Info should be used to describe the example commands that are about to run.
func Info(format string, args ...interface{}) {
	fmt.Printf("\x1b[34;1m%s\x1b[0m\n", fmt.Sprintf(format, args...))
}

// Warning should be used to display a warning
func Warning(format string, args ...interface{}) {
	fmt.Printf("\x1b[36;1m%s\x1b[0m\n", fmt.Sprintf(format, args...))
}

const (
	html = `
		<html>
			<head>
				<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
				<title>Croc Hunter</title>
				<link rel='stylesheet' href='/static/game.css'/>
				<link rel="icon" type="image/png" href="/static/favicon-16x16.png" sizes="16x16" />
				<link rel="icon" type="image/png" href="/static/favicon-32x32.png" sizes="32x32" />
			</head>
			<body>
				<canvas id="canvasBg" width="800" height="490" ></canvas>
				<canvas id="canvasEnemy" width="800" height="500" ></canvas>
				<canvas id="canvasJet" width="800" height="500" ></canvas>
				<canvas id="canvasHud" width="800" height="500" ></canvas>
				<script src='/static/game.js'></script>
				<div class="details">
				<strong>Hostname: </strong>%s<br>
				<strong>Release: </strong>%s<br>
				<strong>Commit: </strong>%s<br>
				<strong>SourceVersion: </strong>%s<br>
				<strong>Powered By: </strong>%s<br>
				</div>
			</body>
		</html>
		`
)

func handler(w http.ResponseWriter, r *http.Request) {

	if r.URL.Path == "/healthz" {
		w.WriteHeader(http.StatusOK)
		return
	}

	hostname, err := os.Hostname()
	if err != nil {
		log.Fatalf("could not get hostname: %s", err)
	}

	release := os.Getenv("WORKFLOW_RELEASE")
	// commit := os.Getenv("GIT_SHA")
	GitCommit := os.Getenv("GIT_SHA")
	SourceVersion := os.Getenv("SourceVersion")
	Namespace := os.Getenv("Namespace")

	if release == "" {
		release = "unknown"
	}
	if Gitcommit == "" {
		Gitcommit = "not present"
	}
	if SourceVersion == "" {
		SourceVersion = "not present"
	}
	if Namespace == "" {
		Namespace = "deis"
	}

	fmt.Fprintf(w, html, hostname, release, Gitcommit, SourceVersion, Namespace)

}
