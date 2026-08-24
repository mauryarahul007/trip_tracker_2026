import { useState } from 'react';
import type { Trip, Expense, Member, Category } from '../types';
import { IconClose, IconDownload, IconCheck, IconShare } from './Icons';
import { triggerHaptic } from '../utils/haptics';

export interface TripArchetype {
  title: string;
  subtitle: string;
  icon: string;
  tag: string;
}

export interface MemberSuperlative {
  memberName: string;
  title: string;
  icon: string;
  note: string;
}

export interface TripRhythm {
  peakDay: string;
  pace: string;
  vibeTag: string;
}

export function getTripArchetype(categories: Category[], expenses: Expense[]): TripArchetype {
  if (expenses.length === 0) {
    return {
      title: 'The Clean Slate Odyssey',
      subtitle: 'A fresh journey waiting for its first great story.',
      icon: '✈️',
      tag: 'NEW HORIZONS',
    };
  }

  const categoryCountMap: Record<string, number> = {};
  const categorySpendMap: Record<string, number> = {};

  expenses.forEach((e) => {
    categoryCountMap[e.category] = (categoryCountMap[e.category] || 0) + 1;
    categorySpendMap[e.category] = (categorySpendMap[e.category] || 0) + e.amount;
  });

  let topCategoryId = '';
  let topCategoryAmt = 0;
  Object.entries(categorySpendMap).forEach(([catId, amt]) => {
    if (amt > topCategoryAmt) {
      topCategoryAmt = amt;
      topCategoryId = catId;
    }
  });

  const topCategoryObj = categories.find((c) => c.id === topCategoryId);
  const topCategoryName = (topCategoryObj?.name || '').toLowerCase();
  const topCategoryIcon = topCategoryObj?.icon || '';

  if (topCategoryName.includes('food') || topCategoryName.includes('dining') || topCategoryName.includes('cafe') || topCategoryIcon === '🍔') {
    return {
      title: 'The Gourmet Pilgrimage',
      subtitle: '80% culinary tastings, 20% walking to the next meal.',
      icon: '🍕',
      tag: 'FOODIE PARADISE',
    };
  }

  if (topCategoryName.includes('stay') || topCategoryName.includes('hotel') || topCategoryName.includes('resort') || topCategoryIcon === '🏨') {
    return {
      title: 'The High-Luxe Sanctuary',
      subtitle: 'Focused on comfort, deep rest, and scenic morning views.',
      icon: '🏖️',
      tag: 'PURE RELAXATION',
    };
  }

  if (topCategoryName.includes('travel') || topCategoryName.includes('flight') || topCategoryName.includes('transport') || topCategoryName.includes('cab') || topCategoryIcon === '✈️' || topCategoryIcon === '🚗') {
    return {
      title: 'The Fast-Paced Expedition',
      subtitle: 'Constantly on the move, chasing new vistas and open roads.',
      icon: '⛰️',
      tag: 'ADVENTURE SEEKERS',
    };
  }

  if (topCategoryName.includes('shop') || topCategoryName.includes('souvenir') || topCategoryIcon === '🛍️') {
    return {
      title: 'The Collector’s Grand Tour',
      subtitle: 'No market left unexplored, bags filled with local gems.',
      icon: '🛍️',
      tag: 'RETAIL ODYSSEY',
    };
  }

  if (topCategoryName.includes('party') || topCategoryName.includes('club') || topCategoryName.includes('drink') || topCategoryIcon === '🍺') {
    return {
      title: 'The Midnight Revelry',
      subtitle: 'Late nights, golden hours, and high-octane celebration.',
      icon: '🎉',
      tag: 'NIGHT VIBES',
    };
  }

  return {
    title: 'The Spontaneous Odyssey',
    subtitle: 'A beautifully balanced expedition where anything could happen.',
    icon: '✨',
    tag: 'EXPLORATION',
  };
}

export function getMemberSuperlatives(
  members: Member[],
  expenses: Expense[],
  categories: Category[]
): MemberSuperlative[] {
  if (members.length === 0) return [];

  const memberSpendMap: Record<string, number> = {};
  const memberCountMap: Record<string, number> = {};
  const memberFoodSpendMap: Record<string, number> = {};
  const memberTravelSpendMap: Record<string, number> = {};

  const foodCatIds = new Set(
    categories
      .filter((c) => c.name.toLowerCase().includes('food') || c.icon === '🍔')
      .map((c) => c.id)
  );

  const travelCatIds = new Set(
    categories
      .filter(
        (c) =>
          c.name.toLowerCase().includes('travel') ||
          c.name.toLowerCase().includes('cab') ||
          c.name.toLowerCase().includes('flight') ||
          c.icon === '✈️' ||
          c.icon === '🚗'
      )
      .map((c) => c.id)
  );

  expenses.forEach((e) => {
    memberSpendMap[e.paidBy] = (memberSpendMap[e.paidBy] || 0) + e.amount;
    memberCountMap[e.paidBy] = (memberCountMap[e.paidBy] || 0) + 1;
    if (foodCatIds.has(e.category)) {
      memberFoodSpendMap[e.paidBy] = (memberFoodSpendMap[e.paidBy] || 0) + e.amount;
    }
    if (travelCatIds.has(e.category)) {
      memberTravelSpendMap[e.paidBy] = (memberTravelSpendMap[e.paidBy] || 0) + e.amount;
    }
  });

  const superlatives: MemberSuperlative[] = [];
  const assignedMembers = new Set<string>();

  // 1. Chief Quartermaster (Most transactions logged)
  let maxCount = 0;
  let topCountMemberId = '';
  Object.entries(memberCountMap).forEach(([id, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topCountMemberId = id;
    }
  });

  if (topCountMemberId) {
    const m = members.find((x) => x.id === topCountMemberId);
    if (m) {
      superlatives.push({
        memberName: m.name,
        title: 'Chief Quartermaster',
        icon: '👑',
        note: 'Coordinated the crew bookings & kept the trip running like clockwork.',
      });
      assignedMembers.add(m.id);
    }
  }

  // 2. Executive Tasting Officer (Top Food coordinator)
  let maxFood = 0;
  let topFoodMemberId = '';
  Object.entries(memberFoodSpendMap).forEach(([id, amt]) => {
    if (amt > maxFood && !assignedMembers.has(id)) {
      maxFood = amt;
      topFoodMemberId = id;
    }
  });

  if (topFoodMemberId) {
    const m = members.find((x) => x.id === topFoodMemberId);
    if (m) {
      superlatives.push({
        memberName: m.name,
        title: 'Executive Tasting Officer',
        icon: '🍕',
        note: 'Always found the tastiest cafes, street food & group treats.',
      });
      assignedMembers.add(m.id);
    }
  }

  // 3. Transit Navigator (Top travel/ride coordinator)
  let maxTravel = 0;
  let topTravelMemberId = '';
  Object.entries(memberTravelSpendMap).forEach(([id, amt]) => {
    if (amt > maxTravel && !assignedMembers.has(id)) {
      maxTravel = amt;
      topTravelMemberId = id;
    }
  });

  if (topTravelMemberId) {
    const m = members.find((x) => x.id === topTravelMemberId);
    if (m) {
      superlatives.push({
        memberName: m.name,
        title: 'Transit Navigator',
        icon: '🚗',
        note: 'Kept the squad rolling across cabs, flights & roads.',
      });
      assignedMembers.add(m.id);
    }
  }

  // Assign fun honorary badges to remaining members
  const honoraryRoles = [
    { title: 'The Vibe Harmonizer', icon: '✨', note: 'Essential squad energy & seamless split participation.' },
    { title: 'Chief Morale Officer', icon: '🎉', note: 'Kept the mood electric from sunrise to sunset.' },
    { title: 'The Spontaneous Trailblazer', icon: '🧭', note: 'Always ready for unplanned detours & hidden spots.' },
    { title: 'Master of Logistics', icon: '⚡', note: 'Swift, dependable, and locked into every group activity.' },
  ];

  let roleIdx = 0;
  members.forEach((m) => {
    if (!assignedMembers.has(m.id) && superlatives.length < 4) {
      const role = honoraryRoles[roleIdx % honoraryRoles.length];
      superlatives.push({
        memberName: m.name,
        title: role.title,
        icon: role.icon,
        note: role.note,
      });
      assignedMembers.add(m.id);
      roleIdx++;
    }
  });

  return superlatives;
}

export function getTripRhythm(expenses: Expense[], trip: Trip): TripRhythm {
  if (expenses.length === 0) {
    return {
      peakDay: 'Every Day',
      pace: 'Chill & Relaxed',
      vibeTag: 'SUNSHINE EXPEDITION',
    };
  }

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayCountMap: Record<number, number> = {};

  expenses.forEach((e) => {
    const d = new Date(e.date);
    if (!isNaN(d.getTime())) {
      const dayIdx = d.getDay();
      dayCountMap[dayIdx] = (dayCountMap[dayIdx] || 0) + 1;
    }
  });

  let maxDayIdx = 5; // Default Friday/Saturday
  let maxDayCount = 0;
  Object.entries(dayCountMap).forEach(([idxStr, count]) => {
    const idx = parseInt(idxStr, 10);
    if (count > maxDayCount) {
      maxDayCount = count;
      maxDayIdx = idx;
    }
  });

  const peakDayName = daysOfWeek[maxDayIdx] || 'Saturday';
  const pace = expenses.length >= 10 ? 'High-Octane & Action Packed' : 'Scenic, Unrushed & Relaxed';

  return {
    peakDay: peakDayName,
    pace,
    vibeTag: trip.destination ? `${trip.destination.toUpperCase()} ADVENTURE` : 'CERTIFIED SQUAD JOURNEY',
  };
}

interface TripWrappedModalProps {
  trip: Trip;
  expenses: Expense[];
  members: Member[];
  categories: Category[];
  onClose: () => void;
}

export function TripWrappedModal({
  trip,
  expenses,
  members,
  categories,
  onClose,
}: TripWrappedModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [shared, setShared] = useState(false);

  const archetype = getTripArchetype(categories, expenses);
  const superlatives = getMemberSuperlatives(members, expenses, categories);
  const rhythm = getTripRhythm(expenses, trip);

  // Render 1080x1920 Instagram Story Canvas
  const generateCanvas = (): HTMLCanvasElement | null => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background Gradient (Dark Obsidian / Emerald Luxury)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1920);
    bgGrad.addColorStop(0, '#09151A');
    bgGrad.addColorStop(0.35, '#0E232A');
    bgGrad.addColorStop(0.7, '#132E37');
    bgGrad.addColorStop(1, '#081418');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Glowing Ambient Neon Orbs
    ctx.beginPath();
    ctx.arc(950, 240, 380, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(63, 203, 189, 0.16)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(100, 1680, 420, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 122, 0, 0.14)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(980, 1100, 300, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(43, 168, 158, 0.1)';
    ctx.fill();

    // Top App Branding
    ctx.font = '700 32px monospace';
    ctx.fillStyle = '#3FCBBD';
    ctx.fillText('TRIP TRACKER · 2026', 100, 160);

    ctx.font = '800 68px serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Trip Wrapped ✨', 100, 245);

    // Header Trip Badge Capsule
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(63, 203, 189, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.roundRect(100, 300, 880, 180, 28);
    ctx.fill();
    ctx.stroke();

    ctx.font = '800 48px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(trip.name, 140, 375);

    ctx.font = '500 28px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    const dateStr = trip.startDate && trip.endDate ? `${trip.startDate} — ${trip.endDate}` : '2026 Journey';
    ctx.fillText(`${dateStr} · ${members.length} Squad Members`, 140, 435);

    // Section 1: Trip Vibe Identity Card
    ctx.fillStyle = 'rgba(63, 203, 189, 0.08)';
    ctx.strokeStyle = 'rgba(63, 203, 189, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.roundRect(100, 520, 880, 280, 32);
    ctx.fill();
    ctx.stroke();

    // Vibe Tag Pill
    ctx.fillStyle = '#3FCBBD';
    ctx.roundRect(140, 560, 240, 44, 22);
    ctx.fill();

    ctx.font = '800 20px sans-serif';
    ctx.fillStyle = '#09151A';
    ctx.fillText(archetype.tag, 165, 590);

    ctx.font = '800 44px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${archetype.icon} ${archetype.title}`, 140, 675);

    ctx.font = '400 28px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillText(archetype.subtitle, 140, 740);

    // Section 2: Squad Superlatives Card
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.roundRect(100, 840, 880, 520, 32);
    ctx.fill();
    ctx.stroke();

    ctx.font = '800 26px sans-serif';
    ctx.fillStyle = '#FF9800';
    ctx.fillText('🎖️ SQUAD SUPERLATIVES', 140, 905);

    // Render Superlative Rows
    let rowY = 970;
    superlatives.slice(0, 3).forEach((item) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.roundRect(140, rowY, 800, 105, 18);
      ctx.fill();

      ctx.font = '700 32px sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`${item.icon} ${item.memberName}`, 170, rowY + 45);

      ctx.font = '700 24px sans-serif';
      ctx.fillStyle = '#3FCBBD';
      ctx.fillText(item.title, 170, rowY + 82);

      rowY += 125;
    });

    // Section 3: Trip Rhythm & Energy Signature
    ctx.fillStyle = 'rgba(255, 122, 0, 0.07)';
    ctx.strokeStyle = 'rgba(255, 122, 0, 0.35)';
    ctx.lineWidth = 2;
    ctx.roundRect(100, 1400, 880, 240, 32);
    ctx.fill();
    ctx.stroke();

    ctx.font = '800 24px sans-serif';
    ctx.fillStyle = '#FF7A00';
    ctx.fillText('⚡ TRIP RHYTHM & HIGHLIGHTS', 140, 1460);

    ctx.font = '700 34px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`🔥 Peak Adventure: ${rhythm.peakDay}`, 140, 1525);

    ctx.font = '400 26px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillText(`Pace: ${rhythm.pace} · ${rhythm.vibeTag}`, 140, 1585);

    // Embossed Passport Stamp Seal
    ctx.save();
    ctx.translate(860, 1720);
    ctx.rotate(-0.15);
    ctx.strokeStyle = '#3FCBBD';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 75, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 67, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '800 18px monospace';
    ctx.fillStyle = '#3FCBBD';
    ctx.textAlign = 'center';
    ctx.fillText('PASSPORT SEAL', 0, -18);
    ctx.font = '800 26px sans-serif';
    ctx.fillText('★ 2026 ★', 0, 12);
    ctx.font = '800 16px monospace';
    ctx.fillText('MISSION COMPLETE', 0, 36);
    ctx.restore();

    // Footer Branding
    ctx.font = '500 26px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.textAlign = 'center';
    ctx.fillText('Tracked with Trip Tracker · trip-tracker.blackmaroon.in', 540, 1850);

    return canvas;
  };

  const handleDownload = () => {
    triggerHaptic('medium');
    setDownloading(true);
    try {
      const canvas = generateCanvas();
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `${trip.name.replace(/\s+/g, '_')}_Wrapped_2026.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    triggerHaptic('success');
    const canvas = generateCanvas();
    if (!canvas) return;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `${trip.name}_Wrapped.png`, { type: 'image/png' });
        try {
          await navigator.share({
            title: `${trip.name} - Trip Wrapped`,
            text: `Our ${trip.name} Trip Wrapped vibes: ${archetype.icon} ${archetype.title}!`,
            files: [file],
          });
          setShared(true);
        } catch {
          handleDownload();
        }
      });
    } else {
      handleDownload();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card fade-in"
        style={{
          maxWidth: '460px',
          padding: '24px',
          background: 'linear-gradient(180deg, #09151A 0%, #0D2027 100%)',
          color: '#F2ECDC',
          border: '1px solid rgba(63, 203, 189, 0.25)',
          borderRadius: '24px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <span style={{ fontSize: '11px', color: '#3FCBBD', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Story Infographic
            </span>
            <h3 style={{ fontSize: '22px', margin: '2px 0 0', color: '#FFFFFF', fontWeight: 800 }}>Trip Wrapped ✨</h3>
          </div>
          <button
            type="button"
            className="secondary-btn"
            style={{ padding: '6px 8px', color: '#F2ECDC', borderColor: 'rgba(255,255,255,0.2)', background: 'transparent' }}
            onClick={onClose}
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Live Card Preview (Number-Free) */}
        <div
          style={{
            padding: '20px',
            borderRadius: '20px',
            background: 'linear-gradient(155deg, #132A32 0%, #091418 100%)',
            border: '1px solid rgba(63, 203, 189, 0.35)',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Trip Header Banner */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>{trip.name}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
              {trip.startDate && trip.endDate ? `${trip.startDate} — ${trip.endDate}` : '2026 Journey'} · {members.length} Travelers
            </div>
          </div>

          {/* Vibe Persona Card */}
          <div
            style={{
              background: 'rgba(63, 203, 189, 0.1)',
              border: '1px solid rgba(63, 203, 189, 0.35)',
              padding: '14px',
              borderRadius: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.05em', color: '#3FCBBD', textTransform: 'uppercase' }}>
                Trip Vibe Identity
              </span>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 700,
                  background: '#3FCBBD',
                  color: '#09151A',
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}
              >
                {archetype.tag}
              </span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
              {archetype.icon} {archetype.title}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginTop: '3px', lineHeight: 1.4 }}>
              {archetype.subtitle}
            </div>
          </div>

          {/* Member Superlatives List */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '14px',
              borderRadius: '14px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#FF9800', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
              🎖️ Squad Superlatives
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {superlatives.slice(0, 3).map((item) => (
                <div
                  key={item.memberName}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#FFFFFF' }}>
                      {item.icon} {item.memberName}
                    </span>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)' }}>{item.note}</div>
                  </div>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#3FCBBD', flexShrink: 0, marginLeft: '8px' }}>
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Trip Rhythm Summary */}
          <div
            style={{
              background: 'rgba(255, 122, 0, 0.08)',
              border: '1px solid rgba(255, 122, 0, 0.25)',
              padding: '12px 14px',
              borderRadius: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#FF7A00', fontWeight: 700, textTransform: 'uppercase' }}>
                ⚡ Peak Adventure Day
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#FFFFFF', marginTop: '2px' }}>
                {rhythm.peakDay}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Pace</div>
              <div style={{ fontSize: '12px', color: '#3FCBBD', fontWeight: 600 }}>{rhythm.pace}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="secondary-btn"
            style={{
              flex: 1,
              padding: '12px',
              color: '#F2ECDC',
              borderColor: 'rgba(255,255,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              borderRadius: '12px',
              fontWeight: 600,
            }}
            onClick={handleDownload}
            disabled={downloading}
          >
            <IconDownload size={16} />
            <span>Download PNG</span>
          </button>
          <button
            type="button"
            className="primary-btn"
            style={{
              flex: 1,
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              borderRadius: '12px',
              fontWeight: 600,
            }}
            onClick={handleShare}
          >
            {shared ? <IconCheck size={16} /> : <IconShare size={16} />}
            <span>{shared ? 'Shared!' : 'Share Story'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
