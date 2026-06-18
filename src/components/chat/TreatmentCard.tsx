import { X, Clock, Tag, Star, CheckCircle2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { TreatmentInfo, MembershipInfo } from "./treatmentData";

interface Props {
  item: TreatmentInfo | MembershipInfo | null;
  onClose: () => void;
}

function isTreatment(item: TreatmentInfo | MembershipInfo): item is TreatmentInfo {
  return 'duration' in item;
}

export function TreatmentCard({ item, onClose }: Props) {
  return (
    <AnimatePresence>
      {item && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 right-6 z-[9999] w-[360px] max-h-[70vh] overflow-hidden rounded-2xl shadow-2xl bg-white border border-slate-200 flex flex-col"
          >
            {isTreatment(item) ? (
              <TreatmentDetail item={item} onClose={onClose} />
            ) : (
              <MembershipDetail item={item} onClose={onClose} />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function TreatmentDetail({ item, onClose }: { item: TreatmentInfo; onClose: () => void }) {
  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-5 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-indigo-200 uppercase tracking-wider mb-1">
              {item.category}
            </p>
            <h2 className="text-[17px] font-bold text-white leading-tight">{item.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
          >
            <X className="h-3.5 w-3.5 text-white" />
          </button>
        </div>

        <div className="flex items-center gap-3 mt-3">
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-white/20 rounded-full px-3 py-1">
            <Tag className="h-3 w-3" /> {item.price}
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-indigo-200 bg-white/10 rounded-full px-3 py-1">
            <Clock className="h-3 w-3" /> {item.duration}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
        <p className="text-[13px] leading-relaxed text-slate-600">{item.description}</p>

        <div>
          <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider mb-2">Benefits</p>
          <ul className="space-y-1.5">
            {item.benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-[13px] text-slate-700">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Recovery</p>
            <p className="text-[12px] text-slate-700 leading-snug">{item.recovery}</p>
          </div>
          <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Ideal For</p>
            <p className="text-[12px] text-slate-700 leading-snug">{item.ideal_for}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-100 flex-shrink-0">
        <p className="text-[11px] text-slate-400 text-center">
          Complimentary consultation included · Noor Aesthetics
        </p>
      </div>
    </>
  );
}

function MembershipDetail({ item, onClose }: { item: MembershipInfo; onClose: () => void }) {
  const tierColors: Record<string, { from: string; to: string; badge: string }> = {
    Silver:   { from: 'from-slate-500',  to: 'to-slate-600',  badge: 'bg-slate-100 text-slate-700' },
    Gold:     { from: 'from-amber-500',  to: 'to-amber-600',  badge: 'bg-amber-100 text-amber-700' },
    Platinum: { from: 'from-indigo-600', to: 'to-violet-600', badge: 'bg-indigo-100 text-indigo-700' },
  };
  const colors = tierColors[item.tier] ?? tierColors.Platinum;

  return (
    <>
      {/* Header */}
      <div className={`bg-gradient-to-br ${colors.from} ${colors.to} px-5 pt-5 pb-4 flex-shrink-0`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-white/60 uppercase tracking-wider mb-1">Membership Package</p>
            <h2 className="text-[17px] font-bold text-white leading-tight">{item.emoji} {item.tier}</h2>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
          >
            <X className="h-3.5 w-3.5 text-white" />
          </button>
        </div>

        <div className="flex items-center gap-3 mt-3">
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-white/20 rounded-full px-3 py-1">
            <Tag className="h-3 w-3" /> {item.price}
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-white/70 bg-white/10 rounded-full px-3 py-1">
            <Star className="h-3 w-3" /> {item.savings}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
        <div>
          <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider mb-2">What's included</p>
          <ul className="space-y-1.5">
            {item.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-[13px] text-slate-700">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Ideal For</p>
            <p className="text-[13px] text-slate-700 leading-snug">{item.ideal_for}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-100 flex-shrink-0">
        <p className="text-[11px] text-slate-400 text-center">
          Contact us to join or for a complimentary consultation
        </p>
      </div>
    </>
  );
}
