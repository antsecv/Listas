import Link from "next/link";
import { auth } from "@/auth";
import { logoutAction } from "@/app/actions";
import { canCreateLists, canManageTemplates, canManageUsers } from "@/lib/permissions";

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/dashboard" className="site-header__brand">
          Listas de Compras
        </Link>

        <nav className="site-header__nav">
          {user ? (
            <>
              <Link href="/dashboard" className="site-header__link">
                Dashboard
              </Link>
              <Link href="/lists" className="site-header__link">
                Listas
              </Link>
              {canManageTemplates(user) ? (
                <Link href="/templates" className="site-header__link">
                  Plantillas
                </Link>
              ) : null}
              {canManageUsers(user) ? (
                <Link href="/admin/users" className="site-header__link">
                  Usuarios
                </Link>
              ) : null}
              {canCreateLists(user) ? (
                <Link href="/lists/new" className="button secondary">
                  Nueva lista
                </Link>
              ) : null}
              <span className="site-header__user">{user.name} · {user.role}</span>
              <form action={logoutAction}>
                <button type="submit" className="button">
                  Salir
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="site-header__link">
                Ingresar
              </Link>
              <Link href="/register" className="button">
                Crear cuenta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
