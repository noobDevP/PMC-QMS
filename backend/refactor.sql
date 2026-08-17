ALTER TABLE unit ADD COLUMN tv_id INTEGER DEFAULT 1;

UPDATE unit 
INNER JOIN division ON unit.division_id = division.id 
SET unit.tv_id = division.tv_id;

ALTER TABLE unit DROP FOREIGN KEY unit_ibfk_1;
ALTER TABLE unit DROP COLUMN division_id;

ALTER TABLE purpose DROP FOREIGN KEY purpose_ibfk_1;
ALTER TABLE purpose CHANGE unit_id division_id INTEGER NOT NULL;

ALTER TABLE ticket DROP FOREIGN KEY ticket_ibfk_1;
ALTER TABLE ticket CHANGE unit_id division_id INTEGER NOT NULL;

ALTER TABLE user DROP FOREIGN KEY user_ibfk_1;
ALTER TABLE user CHANGE unit_id division_id INTEGER;

DROP TABLE division;
RENAME TABLE unit TO division;

ALTER TABLE purpose ADD CONSTRAINT purpose_ibfk_1 FOREIGN KEY (division_id) REFERENCES division(id);
ALTER TABLE ticket ADD CONSTRAINT ticket_ibfk_1 FOREIGN KEY (division_id) REFERENCES division(id);
ALTER TABLE user ADD CONSTRAINT user_ibfk_1 FOREIGN KEY (division_id) REFERENCES division(id);
