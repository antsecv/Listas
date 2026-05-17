-- Align shopping flow schema with existing production data.

ALTER TYPE "ShoppingListStatus" RENAME VALUE 'PENDING' TO 'BORRADOR';
ALTER TYPE "ShoppingListStatus" RENAME VALUE 'REVIEW' TO 'EN_REVISION';
ALTER TYPE "ShoppingListStatus" RENAME VALUE 'DISPATCHED' TO 'DESPACHADA';
ALTER TYPE "ShoppingListStatus" RENAME VALUE 'CANCELLED' TO 'CANCELADA';
ALTER TYPE "ShoppingListStatus" ADD VALUE IF NOT EXISTS 'EN_COMPRA';

CREATE TYPE "ReviewStatus" AS ENUM ('PENDIENTE', 'REVISADO', 'OMITIDO');
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDIENTE_COMPRA', 'COMPRADO', 'NO_REQUIERE', 'NO_DISPONIBLE');

ALTER TABLE "ShoppingList"
  ADD COLUMN "statusUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "statusUpdatedById" TEXT;

ALTER TABLE "ShoppingListItem"
  ADD COLUMN "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN "purchaseStatus" "PurchaseStatus" NOT NULL DEFAULT 'PENDIENTE_COMPRA',
  ADD COLUMN "omitReason" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "purchasedAt" TIMESTAMP(3),
  ADD COLUMN "purchasedById" TEXT;

ALTER TABLE "ShoppingList"
  ADD CONSTRAINT "ShoppingList_statusUpdatedById_fkey"
  FOREIGN KEY ("statusUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ShoppingListItem"
  ADD CONSTRAINT "ShoppingListItem_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ShoppingListItem_purchasedById_fkey"
  FOREIGN KEY ("purchasedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ShoppingList"
  ALTER COLUMN "status" SET DEFAULT 'BORRADOR';

UPDATE "ShoppingList"
SET "statusUpdatedAt" = COALESCE("statusUpdatedAt", "updatedAt"),
    "statusUpdatedById" = COALESCE("statusUpdatedById", "authorId");

UPDATE "ShoppingListItem" AS i
SET "reviewStatus" = (CASE WHEN l."status" = 'BORRADOR' THEN 'PENDIENTE' ELSE 'REVISADO' END)::"ReviewStatus",
    "reviewedAt" = CASE WHEN l."status" = 'BORRADOR' THEN NULL ELSE l."updatedAt" END,
    "reviewedById" = CASE WHEN l."status" = 'BORRADOR' THEN NULL ELSE l."authorId" END,
    "purchaseStatus" = (CASE WHEN i."currentStock" > i."minimumStock" THEN 'NO_REQUIERE' ELSE 'PENDIENTE_COMPRA' END)::"PurchaseStatus"
FROM "ShoppingList" AS l
WHERE i."shoppingListId" = l."id";
