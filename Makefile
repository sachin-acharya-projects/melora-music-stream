.PHONY: dev frontend backend build lint format preview install clean

# Load .env file for backend if it exists
ifneq ("$(wildcard .env)","")
    include .env
    export $(shell sed 's/=.*//' .env)
endif

# Default PORT if not provided in .env
PORT ?= 8000

# Frontend directory
FRONTEND_DIR=frontend

# Backend directory
BACKEND_DIR=backend

# FastAPI app entry
BACKEND_APP=app.main:app

dev:
	@echo "Starting frontend and backend..."
	$(MAKE) -j2 frontend backend

frontend:
	cd $(FRONTEND_DIR) && npm run dev

backend:
	cd $(BACKEND_DIR) && uvicorn $(BACKEND_APP) --host 0.0.0.0 --port $(PORT) --reload

build:
	cd $(FRONTEND_DIR) && npm run build

lint:
	cd $(FRONTEND_DIR) && npm run lint
	cd $(BACKEND_DIR) && python -m ruff check --fix .

format:
	cd $(FRONTEND_DIR) && npm run format
	cd $(BACKEND_DIR) && python -m ruff format .

preview:
	cd $(FRONTEND_DIR) && npm run preview

install:
	cd $(FRONTEND_DIR) && npm install
	cd $(BACKEND_DIR) && pip install -r requirements.txt

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
	find . -type d -name "node_modules" -exec rm -rf {} +