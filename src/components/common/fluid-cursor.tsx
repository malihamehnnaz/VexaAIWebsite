'use client';

import { useState } from 'react';
import FluidCursorExperimental from '@/components/common/fluid-cursor-experimental';
import SmokeyCursor from '@/components/common/smokey-cursor';

export default function FluidCursor() {
  const [failed, setFailed] = useState(false);
  const experimentalEnabled =
    process.env.NEXT_PUBLIC_ENABLE_FLUID_CURSOR === '1' ||
    process.env.NEXT_PUBLIC_ENABLE_FLUID_CURSOR === 'true';

  if (experimentalEnabled && !failed) {
    return <FluidCursorExperimental onFatalError={() => setFailed(true)} />;
  }

  return <SmokeyCursor />;
}
