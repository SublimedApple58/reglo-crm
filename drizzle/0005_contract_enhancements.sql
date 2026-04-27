ALTER TABLE contract_requests ADD COLUMN importo_preventivo REAL;
ALTER TABLE contract_requests ADD COLUMN descrizione_servizio TEXT;
ALTER TABLE contract_requests ADD COLUMN rejection_reason TEXT;
ALTER TABLE contract_requests ADD COLUMN contract_pdf_key TEXT;
ALTER TABLE contract_requests ADD COLUMN contract_pdf_name TEXT;
ALTER TABLE contract_requests ADD COLUMN invoice_pdf_key TEXT;
ALTER TABLE contract_requests ADD COLUMN invoice_pdf_name TEXT;
