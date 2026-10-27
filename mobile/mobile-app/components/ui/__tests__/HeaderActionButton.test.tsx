import React from 'react';
import { render } from '@testing-library/react-native';
import { Plus } from 'lucide-react-native';
import { HeaderActionButton } from '../HeaderActionButton';

describe('HeaderActionButton', () => {
  it('exposes its visible label as an accessible button name', async () => {
    const { getByRole, getByText } = await render(
      <HeaderActionButton label="Invite resident" icon={Plus} onPress={jest.fn()} />
    );

    expect(getByRole('button', { name: 'Invite resident' })).toBeTruthy();
    expect(getByText(/invite resident/i)).toBeTruthy();
  });

  it('reports a loading action as disabled and busy', async () => {
    const { getByRole } = await render(
      <HeaderActionButton label="Saving changes" icon={Plus} loading onPress={jest.fn()} />
    );

    expect(getByRole('button', { name: 'Saving changes' }).props.accessibilityState).toEqual({
      busy: true,
      disabled: true,
    });
  });
});
