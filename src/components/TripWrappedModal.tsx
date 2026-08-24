import { useState } from 'react';
import type { Trip, Expense, Member, Category } from '../types';
import { IconClose, IconDownload, IconCheck, IconShare, IconMoon, IconSun } from './Icons';
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
      icon: '✨',
      tag: 'NEW HORIZONS',
    };
  }

  const categorySpendMap: Record<string, number> = {};

  expenses.forEach((e) => {
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
        note: 'Coordinated crew logistics & kept the trip moving smoothly.',
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
        note: 'Discovered the best dining, cafes & group treats.',
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
    { title: 'Chief Morale Officer', icon: '🎉', note: 'Kept the energy electric from sunrise to sunset.' },
    { title: 'Spontaneous Trailblazer', icon: '🧭', note: 'Always ready for unplanned detours & hidden gems.' },
    { title: 'Master of Flow', icon: '⚡', note: 'Swift, dependable, and locked into every group plan.' },
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
      vibeTag: trip.destination ? `${trip.destination.toUpperCase()} ADVENTURE` : 'SUNSHINE EXPEDITION',
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

  let maxCount = 0;
  Object.values(dayCountMap).forEach((count) => {
    if (count > maxCount) maxCount = count;
  });

  // Collect all days that share peak activity
  const topDayNames: string[] = [];
  Object.entries(dayCountMap).forEach(([idxStr, count]) => {
    if (count === maxCount) {
      topDayNames.push(daysOfWeek[parseInt(idxStr, 10)]);
    }
  });

  let peakDayLabel = 'Saturday';
  if (topDayNames.length === 1) {
    peakDayLabel = topDayNames[0];
  } else if (topDayNames.length === 2) {
    peakDayLabel = `${topDayNames[0]} & ${topDayNames[1]}`;
  } else if (topDayNames.length === 3) {
    peakDayLabel = `${topDayNames[0]}, ${topDayNames[1]} & ${topDayNames[2]}`;
  } else if (topDayNames.length > 3) {
    peakDayLabel = `${topDayNames[0]}, ${topDayNames[1]} & more`;
  }

  const pace = expenses.length >= 10 ? 'High-Octane & Action Packed' : 'Scenic, Unrushed & Relaxed';

  return {
    peakDay: peakDayLabel,
    pace,
    vibeTag: trip.destination ? `${trip.destination.toUpperCase()} ADVENTURE` : 'CERTIFIED SQUAD JOURNEY',
  };
}

// Canvas Safe Rounded Rectangle Helper
function drawSafeRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillColor?: string,
  strokeColor?: string,
  lineWidth = 1
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

// Canvas Multi-Line Text Wrapping Helper with Boundary Protection
function drawSafeWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 2
): number {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  let linesRendered = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + (line ? ' ' : '') + words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = words[n];
      currentY += lineHeight;
      linesRendered++;
      if (linesRendered >= maxLines - 1 && n < words.length - 1) {
        // Last line: truncate with ellipsis if necessary
        let remaining = words.slice(n).join(' ');
        while (ctx.measureText(remaining + '...').width > maxWidth && remaining.length > 0) {
          remaining = remaining.slice(0, -1).trim();
        }
        ctx.fillText(remaining + '...', x, currentY);
        return currentY + lineHeight;
      }
    } else {
      line = testLine;
    }
  }

  if (line) {
    let finalLine = line;
    if (ctx.measureText(finalLine).width > maxWidth) {
      while (ctx.measureText(finalLine + '...').width > maxWidth && finalLine.length > 0) {
        finalLine = finalLine.slice(0, -1).trim();
      }
      finalLine += '...';
    }
    ctx.fillText(finalLine, x, currentY);
  }

  return currentY + lineHeight;
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
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

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

    const isDark = themeMode === 'dark';

    // 1. Background Luxury Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1920);
    if (isDark) {
      bgGrad.addColorStop(0, '#060E12');
      bgGrad.addColorStop(0.3, '#0C1C23');
      bgGrad.addColorStop(0.7, '#102630');
      bgGrad.addColorStop(1, '#050B0E');
    } else {
      bgGrad.addColorStop(0, '#FAF7EE');
      bgGrad.addColorStop(0.35, '#F4EDE0');
      bgGrad.addColorStop(0.75, '#EDE3D2');
      bgGrad.addColorStop(1, '#E5DAC6');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // 2. Soft Ambient Radial Glows (Zero Hard Circles)
    ctx.save();
    // Top-right glow
    const glow1 = ctx.createRadialGradient(920, 260, 20, 920, 260, 480);
    glow1.addColorStop(0, isDark ? 'rgba(63, 203, 189, 0.22)' : 'rgba(15, 111, 99, 0.16)');
    glow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, 1080, 1920);

    // Bottom-left glow
    const glow2 = ctx.createRadialGradient(180, 1650, 20, 180, 1650, 520);
    glow2.addColorStop(0, isDark ? 'rgba(255, 122, 0, 0.18)' : 'rgba(235, 107, 86, 0.18)');
    glow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, 1080, 1920);
    ctx.restore();

    // Theme Color Tokens
    const primaryAccent = isDark ? '#3FCBBD' : '#0F6F63';
    const textPrimary = isDark ? '#FFFFFF' : '#142624';
    const textSecondary = isDark ? 'rgba(255, 255, 255, 0.72)' : 'rgba(20, 38, 36, 0.7)';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.72)';
    const cardBorder = isDark ? 'rgba(63, 203, 189, 0.3)' : 'rgba(15, 111, 99, 0.25)';
    const innerRowBg = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.85)';
    const innerRowBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 111, 99, 0.12)';

    // 3. Top Header Bar
    ctx.font = '700 28px monospace';
    ctx.fillStyle = primaryAccent;
    ctx.fillText('TRIP TRACKER · 2026', 100, 150);

    ctx.font = '800 64px serif';
    ctx.fillStyle = textPrimary;
    ctx.fillText('Trip Wrapped ✨', 100, 230);

    // 4. Hero Trip Banner Card
    drawSafeRoundedRect(ctx, 100, 280, 880, 190, 24, cardBg, cardBorder, 2);

    ctx.font = '800 46px sans-serif';
    ctx.fillStyle = textPrimary;
    const cleanTripTitle = trip.name.length > 20 ? `${trip.name.slice(0, 19)}...` : trip.name;
    ctx.fillText(cleanTripTitle, 145, 355);

    ctx.font = '500 26px sans-serif';
    ctx.fillStyle = textSecondary;
    const dateStr = trip.startDate && trip.endDate ? `${trip.startDate} — ${trip.endDate}` : '2026 Expedition';
    ctx.fillText(`${dateStr}  ·  ${members.length} Squad Travelers`, 145, 415);

    // Official Diagonal Customs Visa Stamp (Option 1: Overlapping Top-Right Hero Banner)
    ctx.save();
    ctx.translate(885, 375);
    ctx.rotate(-0.2);
    ctx.globalAlpha = isDark ? 0.9 : 0.85;

    // Outer double ring
    ctx.strokeStyle = primaryAccent;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, 84, 0, Math.PI * 2);
    ctx.stroke();

    // Middle dashed customs ring
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]); // reset

    // Inner solid ring
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 68, 0, Math.PI * 2);
    ctx.stroke();

    // Text details inside stamp
    ctx.font = '800 13px monospace';
    ctx.fillStyle = primaryAccent;
    ctx.textAlign = 'center';
    ctx.fillText('PASSPORT CONTROL', 0, -30);

    ctx.font = '800 28px sans-serif';
    ctx.fillStyle = isDark ? '#FFFFFF' : primaryAccent;
    ctx.fillText('★ 2026 ★', 0, 2);

    ctx.font = '800 13px monospace';
    ctx.fillStyle = primaryAccent;
    ctx.fillText('MISSION COMPLETE', 0, 26);

    ctx.font = '700 10.5px monospace';
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(15,111,99,0.7)';
    ctx.fillText('OFFICIALLY VERIFIED', 0, 44);

    ctx.restore();

    // 5. Section 1: Trip Vibe Identity Card
    drawSafeRoundedRect(ctx, 100, 505, 880, 290, 28, isDark ? 'rgba(63, 203, 189, 0.08)' : 'rgba(15, 111, 99, 0.06)', cardBorder, 2);

    // Vibe Tag Pill
    drawSafeRoundedRect(ctx, 145, 545, 240, 42, 21, primaryAccent);
    ctx.font = '800 18px sans-serif';
    ctx.fillStyle = isDark ? '#060E12' : '#FFFFFF';
    ctx.fillText(archetype.tag, 168, 572);

    ctx.font = '800 42px sans-serif';
    ctx.fillStyle = textPrimary;
    ctx.fillText(`${archetype.icon}  ${archetype.title}`, 145, 655);

    ctx.font = '400 26px sans-serif';
    ctx.fillStyle = textSecondary;
    ctx.fillText(archetype.subtitle, 145, 720);

    // 6. Section 2: Squad Superlatives Card
    drawSafeRoundedRect(ctx, 100, 830, 880, 515, 28, cardBg, isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 111, 99, 0.18)', 2);

    ctx.font = '800 24px sans-serif';
    ctx.fillStyle = isDark ? '#FF9800' : '#D95D00';
    ctx.fillText('🎖️ SQUAD SUPERLATIVES', 145, 885);

    // Render Superlative Rows
    let rowY = 925;
    superlatives.slice(0, 3).forEach((item) => {
      drawSafeRoundedRect(ctx, 140, rowY, 800, 115, 18, innerRowBg, innerRowBorder, 1.5);

      ctx.font = '700 30px sans-serif';
      ctx.fillStyle = textPrimary;
      ctx.fillText(`${item.icon} ${item.memberName}`, 175, rowY + 45);

      ctx.font = '700 24px sans-serif';
      ctx.fillStyle = primaryAccent;
      ctx.fillText(item.title, 175, rowY + 84);

      rowY += 132;
    });

    // 7. Section 3: Trip Rhythm & Highlights (Dynamic Multi-Line Protection)
    drawSafeRoundedRect(
      ctx,
      100,
      1380,
      880,
      270,
      28,
      isDark ? 'rgba(255, 122, 0, 0.08)' : 'rgba(235, 107, 86, 0.08)',
      isDark ? 'rgba(255, 122, 0, 0.35)' : 'rgba(235, 107, 86, 0.35)',
      2
    );

    ctx.font = '800 22px sans-serif';
    ctx.fillStyle = isDark ? '#FF7A00' : '#C74800';
    ctx.fillText('⚡ TRIP RHYTHM & HIGHLIGHTS', 145, 1435);

    // Peak Adventure Days (supports multiple days with dynamic font sizing)
    const peakTitle = `🔥 Peak Adventure: ${rhythm.peakDay}`;
    ctx.font = peakTitle.length > 34 ? '700 27px sans-serif' : '700 31px sans-serif';
    ctx.fillStyle = textPrimary;
    ctx.fillText(peakTitle, 145, 1490);

    // Pace & Destination cleanly split into wrapped lines
    ctx.font = '500 24px sans-serif';
    ctx.fillStyle = textSecondary;
    ctx.fillText(`Pace: ${rhythm.pace}`, 145, 1545);

    // Route / Destination with safe text wrapping
    if (trip.destination) {
      ctx.font = '500 22px sans-serif';
      ctx.fillStyle = primaryAccent;
      const cleanDest = `📍 ${trip.destination.toUpperCase()}`;
      drawSafeWrappedText(ctx, cleanDest, 145, 1595, 790, 28, 1);
    }

    // 8. Footer
    ctx.font = '500 24px sans-serif';
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(20, 38, 36, 0.55)';
    ctx.textAlign = 'center';
    ctx.fillText('Tracked with Trip Tracker · trip-tracker.blackmaroon.in', 540, 1780);

    return canvas;
  };

  const handleDownload = () => {
    triggerHaptic('medium');
    setDownloading(true);
    try {
      const canvas = generateCanvas();
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `${trip.name.replace(/\s+/g, '_')}_Wrapped_${themeMode}_2026.png`;
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
        const file = new File([blob], `${trip.name}_Wrapped_${themeMode}.png`, { type: 'image/png' });
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

  const isDark = themeMode === 'dark';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card fade-in"
        style={{
          maxWidth: '460px',
          padding: '24px',
          background: isDark ? 'linear-gradient(180deg, #071115 0%, #0C1E26 100%)' : '#FAF7EE',
          color: isDark ? '#F2ECDC' : '#142624',
          border: isDark ? '1px solid rgba(63, 203, 189, 0.3)' : '1px solid rgba(15, 111, 99, 0.25)',
          borderRadius: '24px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          transition: 'background 0.25s ease, color 0.25s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar with Dark / Light Theme Segment Switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', color: isDark ? '#3FCBBD' : '#0F6F63', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Story Infographic
            </span>
            <h3 style={{ fontSize: '22px', margin: '2px 0 0', color: isDark ? '#FFFFFF' : '#142624', fontWeight: 800 }}>
              Trip Wrapped ✨
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Theme Toggle Pills */}
            <div
              style={{
                display: 'flex',
                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,111,99,0.1)',
                borderRadius: '20px',
                padding: '3px',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(15,111,99,0.15)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setThemeMode('dark');
                }}
                style={{
                  background: isDark ? '#3FCBBD' : 'transparent',
                  color: isDark ? '#060E12' : '#0F6F63',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.18s ease',
                }}
              >
                <IconMoon size={13} />
                <span>Night</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setThemeMode('light');
                }}
                style={{
                  background: !isDark ? '#0F6F63' : 'transparent',
                  color: !isDark ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.18s ease',
                }}
              >
                <IconSun size={13} />
                <span>Light</span>
              </button>
            </div>

            <button
              type="button"
              className="secondary-btn"
              style={{
                padding: '6px 8px',
                color: isDark ? '#F2ECDC' : '#142624',
                borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,111,99,0.25)',
                background: 'transparent',
              }}
              onClick={onClose}
            >
              <IconClose size={16} />
            </button>
          </div>
        </div>

        {/* Live Card Preview with Matching Theme */}
        <div
          style={{
            padding: '20px',
            borderRadius: '20px',
            background: isDark
              ? 'linear-gradient(155deg, #10242B 0%, #071115 100%)'
              : 'linear-gradient(155deg, #FFFFFF 0%, #F5EFE4 100%)',
            border: isDark ? '1.5px solid rgba(63, 203, 189, 0.35)' : '1.5px solid rgba(15, 111, 99, 0.25)',
            boxShadow: isDark ? '0 12px 30px rgba(0,0,0,0.4)' : '0 12px 30px rgba(15, 111, 99, 0.08)',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Trip Header Banner with Top-Right Visa Stamp */}
          <div
            style={{
              position: 'relative',
              borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(15,111,99,0.12)',
              paddingBottom: '10px',
              paddingRight: '76px',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 800, color: isDark ? '#FFFFFF' : '#142624' }}>{trip.name}</div>
            <div style={{ fontSize: '12px', color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(20,38,36,0.65)', marginTop: '2px' }}>
              {trip.startDate && trip.endDate ? `${trip.startDate} — ${trip.endDate}` : '2026 Journey'} · {members.length} Travelers
            </div>

            {/* Option 1: Top-Right Customs Visa Stamp */}
            <div
              style={{
                position: 'absolute',
                right: '0px',
                top: '-4px',
                transform: 'rotate(-14deg)',
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                border: `2px solid ${isDark ? '#3FCBBD' : '#0F6F63'}`,
                boxShadow: `inset 0 0 0 2px ${isDark ? 'rgba(63,203,189,0.25)' : 'rgba(15,111,99,0.25)'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDark ? '#3FCBBD' : '#0F6F63',
                fontFamily: 'monospace',
                fontWeight: 800,
                opacity: 0.88,
                pointerEvents: 'none',
                lineHeight: 1.1,
              }}
            >
              <span style={{ fontSize: '6px', letterSpacing: '0.04em' }}>PASSPORT</span>
              <span style={{ fontSize: '9px', fontWeight: 900, color: isDark ? '#FFFFFF' : '#0F6F63' }}>★ 2026 ★</span>
              <span style={{ fontSize: '5.5px' }}>VERIFIED</span>
            </div>
          </div>

          {/* Vibe Persona Card */}
          <div
            style={{
              background: isDark ? 'rgba(63, 203, 189, 0.1)' : 'rgba(15, 111, 99, 0.06)',
              border: isDark ? '1px solid rgba(63, 203, 189, 0.35)' : '1px solid rgba(15, 111, 99, 0.2)',
              padding: '14px',
              borderRadius: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.05em', color: isDark ? '#3FCBBD' : '#0F6F63', textTransform: 'uppercase' }}>
                Trip Vibe Identity
              </span>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 700,
                  background: isDark ? '#3FCBBD' : '#0F6F63',
                  color: isDark ? '#060E12' : '#FFFFFF',
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}
              >
                {archetype.tag}
              </span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: isDark ? '#FFFFFF' : '#142624' }}>
              {archetype.icon} {archetype.title}
            </div>
            <div style={{ fontSize: '12px', color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(20,38,36,0.75)', marginTop: '3px', lineHeight: 1.4 }}>
              {archetype.subtitle}
            </div>
          </div>

          {/* Member Superlatives List */}
          <div
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.65)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(15, 111, 99, 0.15)',
              padding: '14px',
              borderRadius: '14px',
            }}
          >
            <div style={{ fontSize: '11px', color: isDark ? '#FF9800' : '#D95D00', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
              🎖️ Squad Superlatives
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {superlatives.slice(0, 3).map((item) => (
                <div
                  key={item.memberName}
                  style={{
                    background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.9)',
                    border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(15,111,99,0.08)',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '13.5px', color: isDark ? '#FFFFFF' : '#142624' }}>
                      {item.icon} {item.memberName}
                    </span>
                    <div style={{ fontSize: '11px', color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(20,38,36,0.65)' }}>
                      {item.note}
                    </div>
                  </div>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: isDark ? '#3FCBBD' : '#0F6F63', flexShrink: 0, marginLeft: '8px' }}>
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Trip Rhythm Summary with Dynamic Wrapping */}
          <div
            style={{
              background: isDark ? 'rgba(255, 122, 0, 0.08)' : 'rgba(235, 107, 86, 0.08)',
              border: isDark ? '1px solid rgba(255, 122, 0, 0.25)' : '1px solid rgba(235, 107, 86, 0.25)',
              padding: '12px 14px',
              borderRadius: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', color: isDark ? '#FF7A00' : '#C74800', fontWeight: 700, textTransform: 'uppercase' }}>
                ⚡ Peak Adventure Day{rhythm.peakDay.includes('&') || rhythm.peakDay.includes(',') ? 's' : ''}
              </div>
              <span
                style={{
                  fontSize: '11px',
                  color: isDark ? '#3FCBBD' : '#0F6F63',
                  fontWeight: 600,
                  background: isDark ? 'rgba(63, 203, 189, 0.12)' : 'rgba(15, 111, 99, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '8px',
                }}
              >
                {rhythm.pace}
              </span>
            </div>

            <div style={{ fontSize: '14px', fontWeight: 700, color: isDark ? '#FFFFFF' : '#142624' }}>
              🔥 {rhythm.peakDay}
            </div>

            {trip.destination && (
              <div
                style={{
                  fontSize: '11.5px',
                  color: isDark ? '#3FCBBD' : '#0F6F63',
                  fontWeight: 600,
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                }}
              >
                📍 {trip.destination}
              </div>
            )}
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
              color: isDark ? '#F2ECDC' : '#142624',
              borderColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(15,111,99,0.25)',
              background: isDark ? 'transparent' : 'rgba(255,255,255,0.8)',
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
            <span>Download ({isDark ? 'Dark' : 'Light'})</span>
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
