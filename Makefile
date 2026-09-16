.PHONY: up down build logs restart shell clean config

up:
	docker compose up --build

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f --tail=100

restart:
	docker compose restart

shell:
	docker compose exec backend sh

clean:
	docker compose down --volumes --remove-orphans

config:
	docker compose config
