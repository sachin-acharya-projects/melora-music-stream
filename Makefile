.PHONY: dev frontend backend build lint format preview install clean docker-build-fullstack docker-run-fullstack docker-build-backend docker-run-backend docker-clean

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

# Docker targets
docker-build-fullstack:
	docker build -t melora-fullstack:latest .

docker-run-fullstack:
	PORT=$(PORT) docker compose up melora-fullstack -d

docker-build-backend:
	docker build -t melora-backend:latest $(BACKEND_DIR)

docker-run-backend:
	BACKEND_PORT=$(PORT) docker compose up backend -d

docker-clean:
	docker compose down -v
	docker system prune -f
