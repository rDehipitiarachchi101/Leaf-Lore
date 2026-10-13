-- Leaf & Lore core schema.
-- Stores facts only; leaves, clusters, trees and the forest are derived from these rows.

CREATE TABLE app_user (
    id                BIGSERIAL PRIMARY KEY,
    display_name      TEXT        NOT NULL,
    daily_page_goal   INTEGER     NOT NULL CHECK (daily_page_goal > 0),
    yearly_book_goal  INTEGER     CHECK (yearly_book_goal > 0),
    progress_display  TEXT        NOT NULL DEFAULT 'PAGES'
                                  CHECK (progress_display IN ('PAGES', 'PERCENT')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shared catalog: facts that are the same for every reader.
CREATE TABLE book (
    id              BIGSERIAL PRIMARY KEY,
    title           TEXT          NOT NULL,
    authors         TEXT          NOT NULL,
    published_date  DATE,
    genre           TEXT,
    format          TEXT,
    isbn            VARCHAR(13)   UNIQUE,
    asin            VARCHAR(10)   UNIQUE,
    average_rating  NUMERIC(3, 2) CHECK (average_rating BETWEEN 0 AND 5),
    page_count      INTEGER       CHECK (page_count > 0),
    CHECK (isbn IS NOT NULL OR asin IS NOT NULL)
);

-- One reader's relationship to one book.
CREATE TABLE my_book (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT  NOT NULL REFERENCES app_user (id),
    book_id        BIGINT  NOT NULL REFERENCES book (id),
    status         TEXT    NOT NULL CHECK (status IN ('SEED', 'READING', 'PAUSED', 'FINISHED')),
    starting_page  INTEGER NOT NULL DEFAULT 0 CHECK (starting_page >= 0),
    UNIQUE (user_id, book_id)
);

-- "One current read at a time", enforced by the database itself.
CREATE UNIQUE INDEX one_current_read_per_user ON my_book (user_id) WHERE status = 'READING';

-- One row per sitting; each row is drawn as one leaf.
CREATE TABLE reading_session (
    id              BIGSERIAL PRIMARY KEY,
    my_book_id      BIGINT      NOT NULL REFERENCES my_book (id),
    local_date      DATE        NOT NULL,             -- the reader's calendar day, from the browser
    logged_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    pages_read      INTEGER     NOT NULL CHECK (pages_read > 0),
    goal_pages      INTEGER     NOT NULL CHECK (goal_pages > 0), -- daily goal snapshot, stamped by the server
    pulled_forward  TEXT        NOT NULL,
    dragged         TEXT        NOT NULL
);

CREATE INDEX reading_session_my_book_idx ON reading_session (my_book_id);
