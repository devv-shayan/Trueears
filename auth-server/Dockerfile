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

# Build the real binary. migrations/ is needed because db.rs include_str!()s it.
COPY src ./src
COPY migrations ./migrations
RUN touch src/main.rs && cargo build --release

# ---- Runtime stage ----------------------------------------------------------
FROM debian:bookworm-slim AS runtime

# ca-certificates: TLS to Google + Postgres. libssl3: sqlx tls-native-tls runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Run as a non-root user.
RUN useradd --system --uid 10001 appuser
WORKDIR /app

COPY --from=builder /app/target/release/auth-server /usr/local/bin/auth-server

# Bind to all interfaces so the platform can route traffic into the container.
ENV API_HOST=0.0.0.0 \
    API_PORT=3001 \
    RUST_ENV=production

USER appuser
EXPOSE 3001
CMD ["auth-server"]
