import React from 'react';
import { Redirect } from 'expo-router';

export default function ComplaintsIndexRoute() {
  return <Redirect href="/(resident)/complaints/dashboard" />;
}
