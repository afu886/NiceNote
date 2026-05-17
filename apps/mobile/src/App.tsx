import React from 'react'

import { NavigationContainer } from '@react-navigation/native'

import { RootNavigator } from './navigation'

export default function App(): React.JSX.Element {
  return (
    // experimental：mobile 当前仅保留最小导航壳，未接入共享 runtime（参见架构 Phase 5）。
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  )
}
