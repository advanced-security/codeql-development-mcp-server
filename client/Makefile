BINARY_NAME := gh-ql-mcp-client
MODULE := github.com/advanced-security/codeql-development-mcp-server/client

# Disable CGO to avoid Xcode/C compiler dependency
export CGO_ENABLED = 0

# Build flags
LDFLAGS := -s -w

.PHONY: all build test test-unit test-integration lint clean install build-all

all: lint test build

## build: Build the binary for the current platform
build:
	@if [ -f go.mod ]; then \
		go build -ldflags "$(LDFLAGS)" -o $(BINARY_NAME) .; \
	else \
		echo "Go source not yet available — skipping build"; \
	fi

## test: Run unit tests and integration tests
test: test-unit test-integration

## test-unit: Run Go unit tests only
test-unit:
	@if [ -f go.mod ]; then \
		go test ./...; \
	else \
		echo "Go source not yet available — skipping unit tests"; \
	fi

## test-integration: Build binary and run integration tests via run-integration-tests.sh
test-integration: build
	@if [ -f go.mod ]; then \
		ENABLE_ANNOTATION_TOOLS=true scripts/run-integration-tests.sh --no-install-packs; \
	else \
		echo "Go source not yet available — skipping integration tests"; \
	fi

## test-verbose: Run all unit tests with verbose output
test-verbose:
	@if [ -f go.mod ]; then \
		go test -v ./...; \
	else \
		echo "Go source not yet available — skipping verbose tests"; \
	fi

## test-coverage: Run tests with coverage
test-coverage:
	@if [ -f go.mod ]; then \
		go test -coverprofile=coverage.out ./...; \
		go tool cover -html=coverage.out -o coverage.html; \
	else \
		echo "Go source not yet available — skipping coverage"; \
	fi

## lint: Run linters
lint:
	@if [ -f go.mod ]; then \
		if command -v golangci-lint > /dev/null 2>&1; then \
			golangci-lint run ./...; \
		else \
			echo "golangci-lint not found, running go vet only"; \
			go vet ./...; \
		fi; \
	else \
		echo "Go source not yet available — skipping lint"; \
	fi

## clean: Remove build artifacts
clean:
	rm -f $(BINARY_NAME) $(BINARY_NAME)-* coverage.out coverage.html

## install: Install the binary to GOPATH/bin
install:
	@if [ -f go.mod ]; then \
		go install -ldflags "$(LDFLAGS)" .; \
	else \
		echo "Go source not yet available — skipping install"; \
	fi

## build-all: Cross-compile for all supported platforms
build-all:
	@if [ -f go.mod ]; then \
		GOOS=darwin  GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o $(BINARY_NAME)-darwin-amd64 .; \
		GOOS=darwin  GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o $(BINARY_NAME)-darwin-arm64 .; \
		GOOS=linux   GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o $(BINARY_NAME)-linux-amd64 .; \
		GOOS=linux   GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o $(BINARY_NAME)-linux-arm64 .; \
		GOOS=windows GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o $(BINARY_NAME)-windows-amd64.exe .; \
	else \
		echo "Go source not yet available — skipping cross-compile"; \
	fi

## tidy: Tidy go.mod
tidy:
	@if [ -f go.mod ]; then \
		go mod tidy; \
	else \
		echo "Go source not yet available — skipping tidy"; \
	fi

## help: Show this help
help:
	@echo "Available targets:"
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## /  /'
