import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuotaWarningBanner } from './QuotaWarningBanner';

const baseProps = {
  selectedNetworks: ['instagram'] as string[],
  isUnlimited: false,
  instagram: { percentage: 0 },
  linkedin: { percentage: 0 },
};

describe('QuotaWarningBanner', () => {
  it('não renderiza nada quando isUnlimited=true', () => {
    const { container } = render(
      <QuotaWarningBanner {...baseProps} isUnlimited={true} instagram={{ percentage: 100 }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('não renderiza quando selectedNetworks está vazio', () => {
    const { container } = render(<QuotaWarningBanner {...baseProps} selectedNetworks={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('não renderiza quando todas as quotas estão abaixo de 80%', () => {
    const { container } = render(
      <QuotaWarningBanner
        {...baseProps}
        selectedNetworks={['instagram', 'linkedin']}
        instagram={{ percentage: 50 }}
        linkedin={{ percentage: 79 }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra "Quota quase esgotada" quando IG está a 85%', () => {
    render(<QuotaWarningBanner {...baseProps} instagram={{ percentage: 85 }} />);
    expect(screen.getByText('Quota quase esgotada')).toBeInTheDocument();
  });

  it('mostra "Quota IG esgotada" quando IG=100%', () => {
    render(<QuotaWarningBanner {...baseProps} instagram={{ percentage: 100 }} />);
    expect(screen.getByText('Quota IG esgotada')).toBeInTheDocument();
  });

  it('mostra "Quota LI esgotada" quando LinkedIn=100%', () => {
    render(
      <QuotaWarningBanner
        {...baseProps}
        selectedNetworks={['linkedin']}
        linkedin={{ percentage: 100 }}
      />,
    );
    expect(screen.getByText('Quota LI esgotada')).toBeInTheDocument();
  });
});
