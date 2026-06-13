import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#E10600' }}>
      <Tabs.Screen
        name="live"
        options={{
          title: 'Live',
        }}
      />
      <Tabs.Screen
        name="standings"
        options={{
          title: 'Standings',
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
        }}
      />
    </Tabs>
  );
}
