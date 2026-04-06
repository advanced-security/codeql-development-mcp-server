BINARY_NAME := gh-ql-mcp-client
MODULE := github.com/advanced-security/codeql-development-mcp-server/client
VERSION := $(shell grep 'Version = ' cmd/root.go | head -1 | sed 's/.*"\(.*\)"/\1/')

# Disable CGO to avoid Xcode/C compiler dependency
export CGO_ENABLED = 0

# Build flags
LDFLAGS := -s -w

.PHONY: all build test test-unit test-integration lint clean install build-all

all: lint test build

## build: Build the binary for the current platform
build:
	go build -ldflags "$(LDFLAGS)" -o $(BINARY_NAME) .

## test: Run unit tests and integration tests
test: test-unit test-integration

## test-unit: Run Go unit tests only
test-unit:
	go test ./...

## test-integration: Build binary and run integration tests via run-integration-tests.sh
test-integration: build
	ENABLE_ANNOTATION_TOOLS=true scripts/run-integration-tests.sh --no-install-packs

## test-verbose: Run all unit tests with verbose output
test-verbose:
	go test -v ./...

## test-coverage: Run tests with coverage
test-coverage:
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

## lint: Run linters
lint:
	@if command -v golangci-lint > /dev/null 2>&1; then \
		golangci-lint run ./...; \
	else \
		echo "golangci-lint not found, running go vet only"; \
		go vet ./...; \
	fi

## clean: Remove build artifacts
clean:
	rm -f $(BINARY_NAME) $(BINARY_NAME)-* coverage.out coverage.html

## install: Install the binary to GOPATH/bin
install:
	go install -ldflags "$(LDFLAGS)" .

## build-all: Cross-compile for all supported platforms
build-all:
	GOOS=darwin  GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o $(BINARY_NAME)-darwin-amd64 .
	GOOS=darwin  GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o $(BINARY_NAME)-darwin-arm64 .
	GOOS=linux   GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o $(BINARY_NAME)-linux-amd64 .
	GOOS=linux   GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o $(BINARY_NAME)-linux-arm64 .
	GOOS=windows GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o $(BINARY_NAME)-windows-amd64.exe .

## tidy: Tidy go.mod
tidy:
	go mod tidy

## help: Show this help
help:
	@echo "Available targets:"
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## /  /'
