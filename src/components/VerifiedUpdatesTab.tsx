import React, { useState } from 'react';
import { applyHermesUpdate } from '../utils/hermesUpdate';

export function VerifiedUpdatesTab() {
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  const updateHermes = async () => {
    if (!window.confirm('Pull the official Hermes latest image and recreate the Hermes container? This will interrupt Hermes.')) return;
    setUpdating(true);
    setMessage('');
    setError(false);
    try {
      const containerId = await applyHermesUpdate();
      setMessage(`Hermes is running the pulled latest image (container ${containerId}).`);
    } catch (e) {
      setError(true);
      setMessage(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
      <h2 className="text-xl font-bold text-white">System Updates</h2>
      <p className="text-sm text-slate-300">
        Hermes can be updated after migration to this Compose project. This pulls the official
        latest image and recreates the container. Registry scans and updates for other components
        are not yet supported; previous catalog versions were examples, not verified releases.
      </p>
      <button onClick={updateHermes} disabled={updating}
        className="px-4 py-2 rounded-xl bg-indigo-600 text-white disabled:opacity-50">
        {updating ? 'Updating Hermes…' : 'Update Hermes to latest'}
      </button>
      {message && <p role={error ? 'alert' : 'status'} className={error ? 'text-rose-400' : 'text-emerald-400'}>{message}</p>}
    </section>
  );
}
