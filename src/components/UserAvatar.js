import React, { useMemo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

const BG_COLORS = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'];

export default function UserAvatar({ seed = 'user', size = 40, style }) {
  const xml = useMemo(
    () =>
      createAvatar(avataaars, {
        seed,
        backgroundColor: BG_COLORS,
        radius: 50,
      }).toString(),
    [seed],
  );

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          borderWidth: 2,
          borderColor: 'rgba(0,0,0,0.08)',
        },
        style,
      ]}
    >
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
}
