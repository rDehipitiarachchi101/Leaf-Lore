-- Demo data for the first slice: one hard-coded reader and one current read.
-- The book is fictional; its catalog facts are placeholders.

INSERT INTO app_user (id, display_name, daily_page_goal, yearly_book_goal)
VALUES (1, 'Demo Reader', 20, 24);

INSERT INTO book (id, title, authors, published_date, genre, format, isbn, asin, average_rating, page_count)
VALUES (1, 'The Lantern Orchard', 'Mira Calloway', '2021-04-13', 'Fantasy', 'Paperback',
        '9780000000002', 'B0DEMO0001', 4.12, 312);

INSERT INTO my_book (id, user_id, book_id, status, starting_page)
VALUES (1, 1, 1, 'READING', 0);

-- Keep the id sequences ahead of the hand-picked ids above.
SELECT setval('app_user_id_seq', (SELECT max(id) FROM app_user));
SELECT setval('book_id_seq',     (SELECT max(id) FROM book));
SELECT setval('my_book_id_seq',  (SELECT max(id) FROM my_book));
