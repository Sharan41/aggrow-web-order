import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getApiErrorMessage } from "../../api/errorMessage";
import { usersApi } from "../../api/users";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../auth/AuthContext";
import type { User, UserRole } from "../../types";

export default function HoUsers() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => usersApi.listUsers() });
  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => usersApi.listBranches(),
  });

  const createBranch = useMutation({
    mutationFn: (body: { name: string; code: string; address?: string | null }) =>
      usersApi.createBranch(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      showToast("Location created successfully");
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  });

  const createUser = useMutation({
    mutationFn: (body: {
      email: string;
      password: string;
      name: string;
      mobile_number?: string | null;
      role: UserRole;
      branch_id?: number | null;
    }) => usersApi.createUser(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      showToast("User created successfully");
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  });

  const updateUser = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        email?: string;
        password?: string | null;
        name?: string;
        mobile_number?: string | null;
        active?: boolean;
        role?: UserRole;
        branch_id?: number | null;
      };
    }) => usersApi.updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setEditingUser(null);
      showToast("User updated successfully");
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      usersApi.updateUser(id, { active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      showToast(updateUser.variables?.data.active ? "User activated" : "User deactivated");
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  });

  const deleteUser = useMutation({
    mutationFn: (id: number) => usersApi.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      showToast("User deleted successfully");
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  });

  return (
    <div className="space-y-4 md:space-y-6 px-3 md:px-0">
      <h1 className="text-xl md:text-2xl font-semibold">Users & Locations</h1>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <div className="card p-3 md:p-4">
          <h2 className="font-medium mb-3 text-base md:text-lg">Locations</h2>
          <LocationForm
            isSubmitting={createBranch.isPending}
            onCreate={async (b) => {
              await createBranch.mutateAsync(b);
            }}
          />
          <div className="mt-4 divide-y divide-slate-100">
            {(branches ?? []).map((b) => (
              <div key={b.id} className="py-2 text-sm">
                <div className="font-medium">{b.name}</div>
                <div className="text-xs text-slate-500">
                  {b.code}
                  {b.address ? ` · ${b.address}` : ""}
                </div>
              </div>
            ))}
            {!branches?.length && <div className="text-sm text-slate-500 py-2">No locations yet.</div>}
          </div>
        </div>

        <div className="card p-3 md:p-4">
          <h2 className="font-medium mb-3 text-base md:text-lg">Create User</h2>
          <UserForm
            branches={branches ?? []}
            isSubmitting={createUser.isPending}
            onCreate={async (u) => {
              await createUser.mutateAsync(u);
            }}
          />
        </div>
      </div>

      <div className="card p-3 md:p-4">
        <h2 className="font-medium mb-3 text-base md:text-lg">Users</h2>
        <div className="space-y-2">
          {(users ?? []).map((u) => (
            <div
              key={u.id}
              className="border border-slate-200 rounded-lg p-3 flex flex-col md:flex-row md:justify-between md:items-center gap-3"
            >
              <div className="flex-1">
                <div className="font-medium text-sm md:text-base">
                  {u.name}{" "}
                  <span className="text-xs text-slate-500">
                    ({u.role}
                    {u.branch?.name ? ` · ${u.branch.name}` : ""})
                  </span>
                </div>
                <div className="text-xs md:text-sm text-slate-600">{u.email}</div>
                {u.mobile_number && (
                  <div className="text-xs text-slate-500">📱 {u.mobile_number}</div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="inline-flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={u.active}
                    disabled={toggleActive.isPending}
                    onChange={(e) => {
                      toggleActive.mutate({ id: u.id, active: e.target.checked });
                    }}
                  />
                  Active
                </label>
                <button
                  className="btn-secondary text-xs py-1 px-3"
                  onClick={() => setEditingUser(u)}
                >
                  Edit
                </button>
                {u.role !== "ADMIN" && u.id !== currentUser?.id && (
                  <button
                    className="text-xs py-1 px-3 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    disabled={deleteUser.isPending}
                    onClick={() => {
                      if (
                        confirm(
                          `Delete user "${u.name}"? This permanently removes their account and cannot be undone.`,
                        )
                      ) {
                        deleteUser.mutate(u.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingUser && (
        <EditUserModal
          user={editingUser}
          branches={branches ?? []}
          isSubmitting={updateUser.isPending}
          onClose={() => setEditingUser(null)}
          onSave={async (data) => {
            await updateUser.mutateAsync({ id: editingUser.id, data });
          }}
        />
      )}
    </div>
  );
}

function LocationForm({
  onCreate,
  isSubmitting,
}: {
  onCreate: (body: { name: string; code: string; address?: string | null }) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setFormError(null);
        if (!name.trim() || !code.trim()) {
          setFormError("Name and code are required.");
          return;
        }
        try {
          await onCreate({ name: name.trim(), code: code.trim(), address: address.trim() || null });
          setName("");
          setCode("");
          setAddress("");
        } catch (err) {
          setFormError(getApiErrorMessage(err));
        }
      }}
    >
      {formError && (
        <div
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          role="alert"
        >
          {formError}
        </div>
      )}
      <input className="input text-sm" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input text-sm" placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} />
      <input
        className="input text-sm"
        placeholder="Address (optional)"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <button className="btn-secondary text-sm" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Adding…" : "Add location"}
      </button>
    </form>
  );
}

function UserForm({
  branches,
  onCreate,
  isSubmitting,
}: {
  branches: { id: number; name: string }[];
  onCreate: (u: {
    email: string;
    password: string;
    name: string;
    mobile_number?: string | null;
    role: UserRole;
    branch_id?: number | null;
  }) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("CUSTOMER");
  const [branchId, setBranchId] = useState<number | "">("");
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setFormError(null);
        if (!email.trim() || !password || !name.trim()) {
          setFormError("Name, email, and password are required.");
          return;
        }
        try {
          await onCreate({
            email: email.trim(),
            password,
            name: name.trim(),
            mobile_number: mobile.trim() || null,
            role,
            branch_id: role === "CUSTOMER" && branchId !== "" ? Number(branchId) : null,
          });
          setEmail("");
          setPassword("");
          setName("");
          setMobile("");
          setBranchId("");
        } catch (err) {
          setFormError(getApiErrorMessage(err));
        }
      }}
    >
      {formError && (
        <div
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          role="alert"
        >
          {formError}
        </div>
      )}
      <input className="input text-sm" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input
        className="input text-sm"
        placeholder="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="input text-sm"
        placeholder="Mobile Number (optional)"
        type="tel"
        value={mobile}
        onChange={(e) => setMobile(e.target.value)}
      />
      <input
        className="input text-sm"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <select className="input text-sm" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
        <option value="CUSTOMER">Customer</option>
        <option value="HEAD_OFFICE">Head Office</option>
        <option value="FACTORY">Factory</option>
      </select>
      {role === "CUSTOMER" && (
        <select
          className="input text-sm"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">Select location (optional)…</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      )}
      <button className="btn-primary text-sm" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating…" : "Create user"}
      </button>
    </form>
  );
}

function EditUserModal({
  user,
  branches,
  isSubmitting,
  onClose,
  onSave,
}: {
  user: User;
  branches: { id: number; name: string }[];
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (data: {
    email?: string;
    password?: string | null;
    name?: string;
    mobile_number?: string | null;
    role?: UserRole;
    branch_id?: number | null;
  }) => Promise<void>;
}) {
  const [email, setEmail] = useState(user.email);
  const [name, setName] = useState(user.name);
  const [mobile, setMobile] = useState(user.mobile_number || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(user.role);
  const [branchId, setBranchId] = useState<number | "">(user.branch_id ?? "");
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 md:p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg md:text-xl font-semibold mb-4">Edit User</h3>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setFormError(null);
            if (!email.trim() || !name.trim()) {
              setFormError("Name and email are required.");
              return;
            }
            try {
              await onSave({
                email: email.trim(),
                name: name.trim(),
                mobile_number: mobile.trim() || null,
                password: password.trim() || null,
                role,
                branch_id: role === "CUSTOMER" && branchId !== "" ? Number(branchId) : null,
              });
            } catch (err) {
              setFormError(getApiErrorMessage(err));
            }
          }}
        >
          {formError && (
            <div
              className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
              role="alert"
            >
              {formError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              className="input text-sm w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              className="input text-sm w-full"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
            <input
              className="input text-sm w-full"
              type="tel"
              placeholder="Optional"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              New Password (leave blank to keep current)
            </label>
            <input
              className="input text-sm w-full"
              type="password"
              placeholder="Enter new password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select className="input text-sm w-full" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="CUSTOMER">Customer</option>
              <option value="HEAD_OFFICE">Head Office</option>
              <option value="FACTORY">Factory</option>
            </select>
          </div>
          {role === "CUSTOMER" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <select
                className="input text-sm w-full"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Select location (optional)…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-2 mt-2">
            <button type="button" className="btn-secondary flex-1 text-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1 text-sm" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
