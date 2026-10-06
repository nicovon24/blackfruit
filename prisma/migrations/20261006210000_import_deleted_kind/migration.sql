ALTER TABLE "import_source_row"
  DROP CONSTRAINT "import_source_row_kind_check",
  ADD CONSTRAINT "import_source_row_kind_check"
    CHECK ("kind" IN ('sale', 'sample', 'excluded', 'duplicate', 'deleted'));
