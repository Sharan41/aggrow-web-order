import { Link } from "react-router-dom";
import { FORM_TYPE_LABELS, formTypeToParam } from "../../lib/orderFormType";

export default function NewOrderPicker() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="card w-full max-w-md p-6 space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Select order form</h1>
          <p className="text-sm text-slate-500 mt-1">
            Choose which product sheet to use for this order.
          </p>
        </div>

        <div className="grid gap-3">
          {(["AG_GROW", "SULFAG"] as const).map((type) => (
            <Link
              key={type}
              to={`/customer/new/${formTypeToParam(type)}`}
              className="block rounded-lg border border-slate-200 px-4 py-4 hover:border-brand-500 hover:bg-brand-50 transition-colors"
            >
              <div className="font-semibold text-brand-700">{FORM_TYPE_LABELS[type]}</div>
              <div className="text-xs text-slate-500 mt-1">
                {type === "AG_GROW"
                  ? "Standard AG GROW product list and sizes"
                  : "Sulfag (SP) product list — same order workflow"}
              </div>
            </Link>
          ))}
        </div>

        <Link to="/customer/orders" className="block text-center text-sm text-slate-500 hover:text-slate-700">
          Cancel
        </Link>
      </div>
    </div>
  );
}
