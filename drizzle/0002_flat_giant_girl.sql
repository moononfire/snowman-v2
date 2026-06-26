CREATE UNIQUE INDEX "contacts_client_place_id_unique" ON "contacts" USING btree ("client_id","google_place_id");
