import React, { forwardRef, useState } from 'react';
import { TextInput, TextInputProps } from './TextInput';
import { Eye, EyeOff } from 'lucide-react-native';

export const PasswordInput = forwardRef<any, TextInputProps>((props, ref) => {
  const [isSecure, setIsSecure] = useState(true);

  return (
    <TextInput
      ref={ref}
      secureTextEntry={isSecure}
      rightIcon={isSecure ? EyeOff : Eye}
      onRightIconPress={() => setIsSecure(!isSecure)}
      {...props}
    />
  );
});

PasswordInput.displayName = 'PasswordInput';
