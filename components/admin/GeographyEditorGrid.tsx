"use client";

type Row = {
  id: string;
  name: string;
  slug?: string;
};

type Props = {
  title: string;
  rows: Row[];
};

export default function GeographyEditorGrid({ title, rows }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-black text-slate-950">{title}</h3>

        <span className="text-xs font-bold text-slate-500">
          {rows.length} records
        </span>
      </div>

      <div className="max-h-80 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Slug</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-100">
                <td className="p-2 font-bold text-slate-900">{row.name}</td>

                <td className="p-2 text-slate-500">{row.slug}</td>

                <td className="p-2 text-right">
                  <button
                    type="button"
                    className="mr-2 rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="rounded-lg border border-red-200 px-2 py-1 text-xs font-bold text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {!rows.length && (
              <tr>
                <td className="p-3 text-sm font-bold text-slate-400" colSpan={3}>
                  No records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
