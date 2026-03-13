.PHONY: dev frontend backend lint format preview

# Frontend directory
FRONTEND_DIR=frontend

# Backend directory
BACKEND_DIR=backend

# FastAPI app entry
BACKEND_APP=main:app

dev:
	@echo "Starting frontend and backend..."
	$(MAKE) -j2 frontend backend

frontend:
	cd $(FRONTEND_DIR) && npm run dev

backend:
	cd $(BACKEND_DIR) && uvicorn $(BACKEND_APP) --reload

build:
	cd $(FRONTEND_DIR) && npm run build

lint:
	cd $(FRONTEND_DIR) && npm run lint

format:
	cd $(FRONTEND_DIR) && npm run format

preview:
	cd $(FRONTEND_DIR) && npm run preview