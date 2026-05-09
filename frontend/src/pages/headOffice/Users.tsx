import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getApiErrorMessage } from "../../api/errorMessage";
import { usersApi } from "../../api/users";
import type { UserRole } from "../../types";

export default function HoUsers() {
  const qc = useQueryClient();
  const [toggleActiveError, setToggleActiveError] = useState<string | null>(null);
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => usersApi.listUsers() });
  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => usersApi.listBranches(),
  });

  const createBranch = useMutation({
    mutationFn: (body: { name: string; code: string; address?: string | null }) =>
      usersApi.createBranch(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branches"] }),
  });

  const createUser = useMutation({
    mutationFn: (body: {
      email: string;
      password: string;
      name: string;
      role: UserRole;
      branch_id?: number | null;
    }) => usersApi.createUser(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      usersApi.updateUser(id, { active }),
    onSuccess: () => {
      setToggleActiveError(null);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => setToggleActiveError(getApiErrorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Users & Branches</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-4">
          <h2 className="font-medium mb-3">Branches</h2>
          <BranchForm
            isSubmitting={createBranch.isPending}
            onCreate={async (b) => {
              await createBranch.mutateAsync(b);
            }}
          />
          <div className="mt-4 divide-y divide-slate-100">
            {(branches ?? []).map((b) => (
              <div key={b.id} className="py-2 text-sm flex justify-between">
                <div>
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-slate-500">
                    {b.code}
                    {b.address ? ` · ${b.address}` : ""}
                  </div>
                </div>
              </div>
            ))}
            {!branches?.length && <div className="text-sm text-slate-500 py-2">No branches yet.</div>}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="font-medium mb-3">Users</h2>
          <UserForm
            branches={branches ?? []}
            isSubmitting={createUser.isPending}
            onCreate={async (u) => {
              await createUser.mutateAsync(u);
            }}
          />
          {toggleActiveError && (
            <div
              className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
              role="alert"
            >
              {toggleActiveError}
              <button
                type="button"
                className="ml-2 underline text-rose-900"
                onClick={() => setToggleActiveError(null)}
              >
                Dismiss
              </button>
            </div>
          )}
          <div className="mt-4 divide-y divide-slate-100">
            {(users ?? []).map((u) => (
              <div key={u.id} className="py-2 text-sm flex justify-between items-center">
                <div>
                  <div className="font-medium">
                    {u.name}{" "}
                    <span className="text-xs text-slate-500">
                      ({u.role}
                      {u.branch?.name ? ` · ${u.branch.name}` : ""})
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </div>
                <label className="inline-flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={u.active}
                    disabled={toggleActive.isPending}
                    onChange={(e) => {
                      setToggleActiveError(null);
                      toggleActive.mutate({ id: u.id, active: e.target.checked });
                    }}
                  />
                  Active
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BranchForm({
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
      className="grid grid-cols-3 gap-2"
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
          className="col-span-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          role="alert"
        >
          {formError}
        </div>
      )}
      <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input" placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} />
      <input
        className="input"
        placeholder="Address (optional)"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <div className="col-span-3">
        <button className="btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Adding…" : "Add branch"}
        </button>
      </div>
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
    role: UserRole;
    branch_id?: number | null;
  }) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("CUSTOMER");
  const [branchId, setBranchId] = useState<number | "">("");
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <form
      className="grid grid-cols-2 gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setFormError(null);
        if (!email.trim() || !password || !name.trim()) {
          setFormError("Name, email, and password are required.");
          return;
        }
        if (role === "CUSTOMER") {
          if (branchId === "") {
            setFormError("Customer users must have a branch selected.");
            return;
          }
        }
        try {
          await onCreate({
            email: email.trim(),
            password,
            name: name.trim(),
            role,
            branch_id: role === "CUSTOMER" ? Number(branchId) : null,
          });
          setEmail("");
          setPassword("");
          setName("");
          setBranchId("");
        } catch (err) {
          setFormError(getApiErrorMessage(err));
        }
      }}
    >
      {formError && (
        <div
          className="col-span-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          role="alert"
        >
          {formError}
        </div>
      )}
      <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input
        className="input"
        placeholder="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="input"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <select className="input" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
        <option value="CUSTOMER">Customer (Branch)</option>
        <option value="HEAD_OFFICE">Head Office</option>
        <option value="FACTORY">Factory</option>
      </select>
      {role === "CUSTOMER" && (
        <select
          className="input col-span-2"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">Select branch…</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      )}
      <div className="col-span-2">
        <button className="btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating…" : "Create user"}
        </button>
      </div>
    </form>
  );
}
