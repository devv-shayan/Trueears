# syntax=docker/dockerfile:1

# ---- Build stage ------------------------------------------------------------
FROM rust:1-bookworm AS builder
WORKDIR /app

# Pre-build dependencies against a stub so they stay cached across source edits.
COPY Cargo.toml Cargo.lock ./
RUN mkdir src \
    && echo 'fn main() {}' > src/main.rs \
    && cargo build --release \
    && rm -rf src

# Build the real binary. migrations/ is needed because db.rs uses
# sqlx::migrate!("./migrations"), which embeds the files at compile time.
COPY src ./src
COPY migrations ./migrations
RUN touch src/main.rs && cargo build --release

# ---- Runtime stage ----------------------------------------------------------
FROM debian:bookworm-slim AS runtime

# ca-certificates: TLS to LemonSqueezy + Neon Postgres. libssl3: sqlx native-tls.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libssl3 \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --system --uid 10001 appuser
WORKDIR /app

COPY --from=builder /app/target/release/payment-service /usr/local/bin/payment-service

# Bind to all interfaces so the platform can route traffic into the container.
ENV PAYMENT_API_HOST=0.0.0.0 \
    PAYMENT_API_PORT=3002

USER appuser
EXPOSE 3002
CMD ["payment-service"]
