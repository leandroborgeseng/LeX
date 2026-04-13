-- Prémio total do seguro (contrato); devolução na quitação é calculada de forma proporcional no app.
ALTER TABLE "Financing" RENAME COLUMN "insuranceRefundOnPayoff" TO "insuranceTotalPremium";
