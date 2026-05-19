-- Add purchase cost modes and purchase tracking.

CREATE TYPE "PurchaseCostMode" AS ENUM ('TOTAL_LISTA', 'POR_PRODUCTO');

ALTER TABLE "Template"
ADD COLUMN "purchaseCostMode" "PurchaseCostMode" NOT NULL DEFAULT 'TOTAL_LISTA';

ALTER TABLE "ShoppingList"
ADD COLUMN "purchaseCostMode" "PurchaseCostMode" NOT NULL DEFAULT 'TOTAL_LISTA',
ADD COLUMN "purchaseTotalCost" DECIMAL(12, 2);

ALTER TABLE "ShoppingListItem"
ADD COLUMN "purchasedQuantity" DECIMAL(12, 3),
ADD COLUMN "purchaseCost" DECIMAL(12, 2);
