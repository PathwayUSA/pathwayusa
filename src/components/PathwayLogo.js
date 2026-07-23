import React from 'react';
import { Image, View } from 'react-native';

const logoSource = require('../../assets/PATHWAYLOGO.png');

export default function PathwayLogo({ size = 120, variant = 'full', style }) {
  const aspectRatio = 1.4;
  const width  = variant === 'icon' ? size * 0.6 : size;
  const height = width / aspectRatio;

  if (variant === 'white') {
    return (
      <View style={[{ width, height }, style]}>
        <Image
          source={logoSource}
          style={{ width, height, tintColor: 'white' }}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <Image
      source={logoSource}
      style={[{ width, height }, style]}
      resizeMode="contain"
    />
  );
}
