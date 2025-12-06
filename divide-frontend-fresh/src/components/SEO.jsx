import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * SEO Component for dynamic meta tags on each page
 * Usage: <SEO title="Page Title" description="Page description" />
 */
export default function SEO({
    title,
    description,
    keywords,
    image,
    url,
    type = 'website',
    noindex = false,
    children
}) {
    const siteName = 'The Divide';
    const defaultDescription = 'The first social betting game where minority wins 97% of the pot. Go Long or Short on tribal debates like iPhone vs Android, Trump vs Biden. Beat the crowd and win big.';
    const defaultImage = 'https://thedivide.app/og-image.png';
    const defaultUrl = 'https://thedivide.app';

    const fullTitle = title ? `${title} | ${siteName}` : `${siteName} | Social Betting Game Where Minority Wins`;
    const metaDescription = description || defaultDescription;
    const metaImage = image || defaultImage;
    const metaUrl = url || defaultUrl;
    const metaKeywords = keywords || 'social betting, prediction market, minority wins, crowd prediction, betting game, long short, pvp betting';

    return (
        <Helmet>
            {/* Primary Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="title" content={fullTitle} />
            <meta name="description" content={metaDescription} />
            <meta name="keywords" content={metaKeywords} />

            {/* Robots */}
            {noindex ? (
                <meta name="robots" content="noindex, nofollow" />
            ) : (
                <meta name="robots" content="index, follow, max-image-preview:large" />
            )}

            {/* Canonical URL */}
            <link rel="canonical" href={metaUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={metaUrl} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={metaDescription} />
            <meta property="og:image" content={metaImage} />
            <meta property="og:site_name" content={siteName} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={metaUrl} />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={metaDescription} />
            <meta name="twitter:image" content={metaImage} />

            {children}
        </Helmet>
    );
}

// Pre-configured SEO for common pages
export const SEOHome = () => (
    <SEO
        title="Social Betting Game Where Minority Wins"
        description="The Divide is the first social betting game where minority wins 97% of the pot. Go Long or Short on tribal debates. No house edge. Pure PvP."
        keywords="social betting, prediction market, minority wins, betting game, crowd prediction, long short trading, pvp betting, social casino"
        url="https://thedivide.app/"
    />
);

export const SEODivides = () => (
    <SEO
        title="Active Divides"
        description="Browse and bet on active Divides. Pick a side, go Long or Short, and win 97% of the pot if you're in the minority. New debates added constantly."
        keywords="active bets, live betting, current divides, social betting markets, prediction markets"
        url="https://thedivide.app/divides"
    />
);

export const SEOLeaderboard = () => (
    <SEO
        title="Leaderboard"
        description="See who's crushing it on The Divide. Top players, biggest wins, highest win rates. Can you make the leaderboard?"
        keywords="betting leaderboard, top players, biggest wins, gambling leaderboard"
        url="https://thedivide.app/leaderboard"
    />
);

export const SEOCasino = () => (
    <SEO
        title="Casino Games"
        description="Play Blackjack, Plinko, Keno and more casino games on The Divide. Fair odds, instant payouts, no limits."
        keywords="online casino, blackjack, plinko, keno, casino games, online gambling"
        url="https://thedivide.app/casino"
    />
);

export const SEOProfile = ({ username }) => (
    <SEO
        title={username ? `${username}'s Profile` : 'My Profile'}
        description={`View ${username || 'your'} betting history, stats, and achievements on The Divide.`}
        noindex={true}
        url="https://thedivide.app/profile"
    />
);

// For individual divide pages
export const SEODivide = ({ divide }) => {
    if (!divide) return null;

    return (
        <SEO
            title={`${divide.optionA} vs ${divide.optionB}`}
            description={`${divide.title} - Go Long or Short! Current pot: $${divide.pot?.toFixed(2) || '0.00'}. Pick the minority side and win 97% of the pot.`}
            keywords={`${divide.optionA}, ${divide.optionB}, ${divide.category}, betting, prediction`}
            url={`https://thedivide.app/divide/${divide._id || divide.id}`}
            type="article"
        />
    );
};
