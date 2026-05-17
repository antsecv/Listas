import type { UserRole } from "@prisma/client";

type SessionUser = {
  id: string;
  role: UserRole;
};

type ListLike = {
  authorId: string;
  status: string;
};

export function isAdmin(role: UserRole) {
  return role === "ADMIN";
}

export function isSolicitante(role: UserRole) {
  return role === "SOLICITANTE";
}

export function isComprador(role: UserRole) {
  return role === "COMPRADOR";
}

export function canCreateLists(user: SessionUser) {
  return isAdmin(user.role) || isSolicitante(user.role);
}

export function canViewAllLists(user: SessionUser) {
  return isAdmin(user.role) || isComprador(user.role);
}

export function canChangeListStatus(user: SessionUser) {
  return isAdmin(user.role) || isComprador(user.role);
}

export function canSendListToReview(user: SessionUser, list: ListLike) {
  return (isAdmin(user.role) || isSolicitante(user.role)) && list.authorId === user.id && list.status === "BORRADOR";
}

export function canReviewProducts(user: SessionUser, list: ListLike) {
  return isAdmin(user.role) || (isSolicitante(user.role) && list.authorId === user.id && list.status === "BORRADOR");
}

export function canManagePurchases(user: SessionUser, list: ListLike) {
  if (isAdmin(user.role)) {
    return true;
  }

  if (isComprador(user.role)) {
    return list.status === "EN_REVISION" || list.status === "EN_COMPRA";
  }

  return false;
}

export function canManageTemplates(user: SessionUser) {
  return isAdmin(user.role);
}

export function canManageUsers(user: SessionUser) {
  return isAdmin(user.role);
}

export function canViewList(user: SessionUser, list: ListLike) {
  if (isAdmin(user.role)) {
    return true;
  }

  if (isComprador(user.role)) {
    return list.status !== "BORRADOR";
  }

  return list.authorId === user.id;
}

export function canEditList(user: SessionUser, list: ListLike) {
  if (isAdmin(user.role)) {
    return true;
  }

  return isSolicitante(user.role) && list.authorId === user.id && list.status === "BORRADOR";
}
