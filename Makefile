# Load .env file if exists
ifneq ("$(wildcard .env)","")
    include .env
    export $(shell sed 's/=.*//' .env)
endif

# Dynamic Variables
PYTHON   ?= python3
PORT     ?= 8000
NODE_PM  ?= pnpm

# Docker Configuration
DOCKER_FULLSTACK_IMAGE ?= melora-fullstack:latest
DOCKER_BACKEND_IMAGE   ?= melora-backend:latest

COMPOSE ?= docker compose

# Project Paths
ROOT_DIR     := $(CURDIR)
BACKEND_DIR  := $(ROOT_DIR)/backend
FRONTEND_DIR := $(ROOT_DIR)/frontend

VENV_DIR := $(BACKEND_DIR)/.venv
BIN_DIR  := $(VENV_DIR)/bin

# Backend Commands
PIP     := $(BIN_DIR)/pip
PYTEST  := $(BIN_DIR)/pytest
UVICORN := $(BIN_DIR)/uvicorn
RUFF    := $(BIN_DIR)/ruff
MYPY    := $(BIN_DIR)/mypy

# Terminal Output
BLUE   := \033[34m
GREEN  := \033[32m
YELLOW := \033[33m
RESET  := \033[0m

INFO    := $(BLUE)➤$(RESET)
SUCCESS := $(GREEN)➤$(RESET)
WARN    := $(YELLOW)➤$(RESET)

# Shell Configuration
SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
.ONESHELL:

# Default Target
.DEFAULT_GOAL := help


##@ Help

.PHONY: help

help: ## Display available commands
	@echo "Full-stack Development Toolkit"
	@echo "Utilities for backend, frontend, testing, linting, formatting, and local development."
	@echo ""
	@echo "Usage:"
	@echo "  make <target>"
	@echo ""
	@echo "Examples:"
	@echo "  make install"
	@echo "  make dev"
	@echo "  make backend-dev PORT=9000"
	@echo ""

	@awk 'BEGIN {FS = ":.*## "}; \
	/^##@/ { \
		printf "\n\033[1m%s\033[0m\n", substr($$0, 5) \
	} \
	/^[a-zA-Z0-9_-]+:.*## / { \
		printf "  \033[36m%-24s\033[0m %s\n", $$1, $$2 \
	}' $(MAKEFILE_LIST)

	@echo ""


##@ Environment Setup

.PHONY: env install frontend-install backend-install

$(VENV_DIR): ## Create Python virtual environment
	@printf "$(INFO) Creating virtual environment...\n"
	$(PYTHON) -m venv $(VENV_DIR)
	@printf "$(SUCCESS) Virtual environment created at $(VENV_DIR)\n"

env: $(VENV_DIR) ## Create virtual environment

install: $(VENV_DIR) frontend-install backend-install ## Install all project dependencies
	@echo ""
	@printf "$(SUCCESS) Installation complete.\n"

frontend-install: ## Install frontend dependencies
	@echo ""
	@printf "$(INFO) Installing frontend dependencies...\n"
	cd $(FRONTEND_DIR)
	$(NODE_PM) install
	@printf "$(SUCCESS) Frontend dependencies installed.\n"


backend-install: ## Install backend dependencies
	@echo ""
	@printf "$(INFO) Installing backend dependencies...\n"
	cd $(BACKEND_DIR)
	$(PIP) install -e .[dev]
	@printf "$(SUCCESS) Backend dependencies installed.\n"


##@ Development

.PHONY: dev backend-dev frontend-dev

dev: ## Run backend and frontend concurrently
	@printf "$(INFO) Starting full development environment...\n"
	$(MAKE) -j2 backend-dev frontend-dev

backend-dev: ## Run FastAPI backend server
	@printf "$(INFO) Starting backend server on port $(PORT)...\n"
	cd $(BACKEND_DIR)
	$(UVICORN) app.main:app \
		--reload \
		--host 0.0.0.0 \
		--port $(PORT)

frontend-dev: ## Run React frontend development server
	@printf "$(INFO) Starting frontend development server...\n"
	cd $(FRONTEND_DIR)
	$(NODE_PM) run dev


##@ Testing

.PHONY: test backend-test frontend-test

test: backend-test frontend-test ## Run all tests

backend-test: ## Run backend tests
	@printf "$(INFO) Running backend tests...\n"
	cd $(BACKEND_DIR)
	$(PYTEST)

frontend-test: ## Run frontend tests
	@printf "$(INFO) Running frontend tests...\n"
	cd $(FRONTEND_DIR)
	$(NODE_PM) run test


##@ Linting

.PHONY: lint backend-lint frontend-lint

lint: backend-lint frontend-lint ## Run all linters

backend-lint: ## Run backend linters
	@printf "$(INFO) Running Ruff...\n"
	cd $(BACKEND_DIR)
	$(RUFF) check .

frontend-lint: ## Run frontend linters
	@printf "$(INFO) Running ESLint and Stylelint...\n"
	cd $(FRONTEND_DIR)
	$(NODE_PM) run lint
	$(NODE_PM) run lint:css


##@ Formatting

.PHONY: format backend-format frontend-format

format: backend-format frontend-format ## Format backend and frontend code

backend-format: ## Format backend code
	@printf "$(INFO) Formatting backend code...\n"
	cd $(BACKEND_DIR)
	$(RUFF) format .
	$(RUFF) check --fix --select I .

frontend-format: ## Format frontend code
	@printf "$(INFO) Formatting frontend code...\n"
	cd $(FRONTEND_DIR)
	$(NODE_PM) run format


##@ Type Checking

.PHONY: typecheck backend-typecheck frontend-typecheck

typecheck: backend-typecheck frontend-typecheck ## Run all type checkers

backend-typecheck: ## Run backend type checker
	@printf "$(INFO) Running MyPy...\n"
	cd $(BACKEND_DIR)
	$(MYPY) .

frontend-typecheck: ## Run frontend type checker
	@printf "$(INFO) Running frontend type checker...\n"
	cd $(FRONTEND_DIR)
	$(NODE_PM) run typecheck


##@ Database Migrations

.PHONY: migrate-create migrate-apply migrate-rollback migrate-current

migrate-create: ## Create a new database migration (Usage: make migrate-create MESSAGE="description")
	@printf "$(INFO) Creating new migration: $(MESSAGE)...\n"
	cd $(BACKEND_DIR)
	$(BIN_DIR)/alembic revision --autogenerate -m "$(MESSAGE)"

migrate-apply: ## Apply all pending migrations
	@printf "$(INFO) Applying migrations...\n"
	cd $(BACKEND_DIR)
	$(BIN_DIR)/alembic upgrade head

migrate-rollback: ## Rollback the last migration
	@printf "$(INFO) Rolling back last migration...\n"
	cd $(BACKEND_DIR)
	$(BIN_DIR)/alembic downgrade -1

migrate-current: ## Show current migration version
	@printf "$(INFO) Current migration version:\n"
	cd $(BACKEND_DIR)
	$(BIN_DIR)/alembic current


##@ Frontend Build

.PHONY: frontend-build frontend-preview

frontend-build: ## Build frontend for production
	@printf "$(INFO) Building frontend...\n"
	cd $(FRONTEND_DIR)
	$(NODE_PM) run build

frontend-preview: ## Preview production frontend build
	@printf "$(INFO) Previewing frontend build...\n"
	cd $(FRONTEND_DIR)
	$(NODE_PM) run preview


##@ Mobile (React Native / Expo)

.PHONY: mobile-start mobile-run-android mobile-build-android

ANDROID_JAVA_HOME ?= /usr/lib/jvm/java-17-openjdk-amd64

MOBILE_DIR := $(ROOT_DIR)/mobile

mobile-start: ## Start the Expo dev server (Metro) for the mobile app
	cd $(MOBILE_DIR) && npx expo start

mobile-run-android: ## Build + install the debug APK on a connected device (dev build)
	cd $(MOBILE_DIR) && JAVA_HOME=$(ANDROID_JAVA_HOME) npx expo run:android

mobile-build-android: ## Build the release Android App Bundle (AAB)
	cd $(MOBILE_DIR) && npx expo prebuild --platform android
	cd $(MOBILE_DIR)/android && JAVA_HOME=$(ANDROID_JAVA_HOME) ./gradlew bundleRelease
	@printf "$(SUCCESS) AAB at mobile/android/app/build/outputs/bundle/release/app-release.aab\n"


##@ Docker

.PHONY: docker-build-fullstack docker-run-fullstack \
        docker-build-backend docker-run-backend docker-clean \
        docker-rebuild-fullstack docker-check docker-redis

docker-build-fullstack: ## Build full-stack Docker image
	@printf "$(INFO) Building full-stack Docker image...\n"
	docker build -t $(DOCKER_FULLSTACK_IMAGE) .

docker-run-fullstack: ## Run full-stack Docker container via Docker Compose
	@printf "$(INFO) Starting full-stack container...\n"
	PORT=$(PORT) $(COMPOSE) up melora-fullstack -d

docker-build-backend: ## Build backend Docker image
	@printf "$(INFO) Building backend Docker image...\n"
	docker build -t $(DOCKER_BACKEND_IMAGE) $(BACKEND_DIR)

docker-run-backend: ## Run backend container via Docker Compose
	@printf "$(INFO) Starting backend container...\n"
	BACKEND_PORT=$(PORT) $(COMPOSE) up backend -d

docker-redis: ## Start Redis service only
	@printf "$(INFO) Starting Redis...\n"
	$(COMPOSE) up redis -d

docker-clean: ## Stop containers and remove Docker volumes
	@printf "$(WARN) Cleaning Docker resources...\n"
	$(COMPOSE) down -v
	docker system prune -f
	@printf "$(SUCCESS) Docker cleanup complete.\n"

docker-rebuild-fullstack: docker-clean docker-build-fullstack ## Rebuild full-stack Docker image
	@printf "$(SUCCESS) Full-stack image rebuilt.\n"

docker-check: docker-build-backend ## Verify backend Docker image builds successfully


##@ Quality Checks

.PHONY: check backend-check frontend-check

check: backend-check frontend-check ## Run linting, type checking, and tests

backend-check: ## Run backend linting, type checking, and tests
	@printf "$(INFO) Running backend checks...\n"
	$(MAKE) backend-lint backend-typecheck backend-test

frontend-check: ## Run frontend linting, type checking, and tests
	@printf "$(INFO) Running frontend checks...\n"
	$(MAKE) frontend-lint frontend-typecheck frontend-test frontend-build


##@ Cleanup

.PHONY: clean

clean: ## Remove caches and temporary files
	@printf "$(WARN) Cleaning project...\n"

	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +

	rm -rf $(FRONTEND_DIR)/node_modules
	rm -rf $(VENV_DIR)

	rm -rf build/
	rm -rf dist/
	rm -rf *.egg-info

	@printf "$(SUCCESS) Cleanup complete.\n"