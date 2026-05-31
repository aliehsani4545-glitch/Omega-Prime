# Omega Prime X — developer convenience targets
.PHONY: install dev seed pipeline report test typecheck frontend up down logs clean

install:
	npm install
	cd frontend && npm install

dev:            ## Run the backend API (http://localhost:8080)
	npm run dev

frontend:       ## Run the cockpit UI (http://localhost:3000)
	cd frontend && npm run dev

seed:           ## Run one intelligence cycle and print a summary
	npm run seed

pipeline:       ## Run a cycle and write reports/latest.md
	npm run pipeline

report: pipeline
	@echo "See reports/latest.md"

test:
	npm test

typecheck:
	npm run typecheck

up:             ## Full stack via Docker Compose
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

clean:
	rm -rf node_modules dist frontend/node_modules frontend/.next reports/latest.md
