import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Dimensions, TouchableOpacity, Image } from 'react-native';
import { useTranslation } from '../../src/utils/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = Math.min(SCREEN_WIDTH - 32, 400);
const BANNER_HEIGHT = Math.round((BANNER_WIDTH - 8) * (216 / 472));

export interface BannerItem {
  id: string;
  image: any;
  titleKey: string;
  defaultTitle: string;
}

const BANNERS: BannerItem[] = [
  {
    id: '1',
    image: require('../../assets/images/banners/banner_community.png'),
    titleKey: 'banner_welcome_title',
    defaultTitle: 'Community',
  },
  {
    id: '2',
    image: require('../../assets/images/banners/banner_security.png'),
    titleKey: 'banner_qr_title',
    defaultTitle: 'Security Gate',
  },
  {
    id: '3',
    image: require('../../assets/images/banners/banner_amenities.png'),
    titleKey: 'banner_amenities_title',
    defaultTitle: 'Amenities',
  },
  {
    id: '4',
    image: require('../../assets/images/banners/banner_financial.png'),
    titleKey: 'banner_billing_title',
    defaultTitle: 'Financial Suite',
  },
];

interface HeroBannerProps {
  onBannerPress?: (banner: BannerItem) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onBannerPress }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { t } = useTranslation();

  useEffect(() => {
    let isMounted = true;
    const timer = setInterval(() => {
      if (!isMounted) return;
      setActiveIndex((prev) => {
        if (!isMounted) return prev;
        const nextIndex = (prev + 1) % BANNERS.length;
        scrollViewRef.current?.scrollTo({
          x: nextIndex * BANNER_WIDTH,
          animated: true,
        });
        return nextIndex;
      });
    }, 4500);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  const handleScrollEnd = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / BANNER_WIDTH);
    setActiveIndex(index);
  };

  return (
    <View className="gap-2.5 my-2">
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        snapToInterval={BANNER_WIDTH}
        decelerationRate="fast"
      >
        {BANNERS.map((banner) => (
          <TouchableOpacity
            key={banner.id}
            activeOpacity={0.92}
            onPress={() => onBannerPress && onBannerPress(banner)}
            style={{ width: BANNER_WIDTH }}
            className="px-1"
          >
            <View
              style={{
                width: BANNER_WIDTH - 8,
                height: BANNER_HEIGHT,
              }}
              className="rounded-3xl overflow-hidden border border-border/70 shadow-xs bg-card"
            >
              <Image
                source={banner.image}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
                accessibilityLabel={t(banner.titleKey, banner.defaultTitle)}
              />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      <View className="flex-row justify-center items-center gap-1.5 pt-1">
        {BANNERS.map((_, idx) => (
          <View
            key={idx}
            className={`h-1.5 rounded-full transition-all ${
              idx === activeIndex ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
            }`}
          />
        ))}
      </View>
    </View>
  );
};

export default HeroBanner;

