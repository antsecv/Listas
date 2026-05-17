import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { updateUserRoleAction } from "@/app/actions";
import type { UserRole } from "@prisma/client";

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  const roles: UserRole[] = ["ADMIN", "SOLICITANTE", "COMPRADOR"];

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div>
        <h1 className="title">Usuarios</h1>
        <p className="subtitle">Gestiona roles y accesos del sistema.</p>
      </div>

      <div className="card">
        <table className="table responsive-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Creado</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td data-label="Nombre">{user.name}</td>
                <td data-label="Correo">{user.email}</td>
                <td data-label="Rol">
                  <form action={updateUserRoleAction} className="status-inline-form">
                    <input type="hidden" name="userId" value={user.id} />
                    <select name="role" defaultValue={user.role} className="inline-role-select">
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="button">Guardar</button>
                  </form>
                </td>
                <td data-label="Creado">{user.createdAt.toLocaleString("es-ES")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
