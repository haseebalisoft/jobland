import React from 'react'
import { Bell, Search, User, FileText, CheckCircle, Clock, Settings, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Dashboard() {
    return (
        <div style={styles.layout}>
            <aside style={styles.sidebar}>
                <div style={styles.logo}>
                    <div style={styles.logoIcon}></div>
                    JobLand
                </div>
                <nav style={styles.nav}>
                    <NavItem icon={<User size={20} />} label="Overview" active />
                    <NavItem icon={<FileText size={20} />} label="My Resumes" />
                    <NavItem icon={<CheckCircle size={20} />} label="Applications" />
                    <NavItem icon={<Settings size={20} />} label="Settings" />
                </nav>
                <div style={{ marginTop: 'auto' }}>
                    <Link to="/" style={{ ...styles.navItem, color: 'var(--gray)' }}>
                        <LogOut size={20} />
                        Logout
                    </Link>
                </div>
            </aside>

            <main style={styles.main}>
                <header style={styles.header}>
                    <div style={styles.searchBar}>
                        <Search size={18} color="var(--gray-light)" />
                        <input type="text" placeholder="Search..." style={styles.searchInput} />
                    </div>
                    <div style={styles.profileArea}>
                        <button style={styles.iconBtn}>
                            <Bell size={20} />
                        </button>
                        <div style={styles.avatar}>
                            JD
                        </div>
                    </div>
                </header>

                <div style={styles.content}>
                    <h1 style={styles.welcome}>Welcome back, John! 👋</h1>
                    <p style={styles.subtitle}>Here is what's happening with your job search today.</p>

                    <div style={styles.statsGrid}>
                        <StatCard number="3" label="Active Applications" color="#4F46E5" icon={<Clock />} />
                        <StatCard number="1" label="Interviews Scheduled" color="#22C55E" icon={<CheckCircle />} />
                        <StatCard number="2" label="Resumes Generated" color="#F59E0B" icon={<FileText />} />
                    </div>

                    <div style={styles.recentActivity}>
                        <h3 style={styles.activityTitle}>Recent Activity</h3>
                        <div style={styles.activityCard}>
                            <div style={styles.activityList}>
                                <ActivityItem title="Application updated" desc="Google - Frontend Developer role moved to Interview" time="2h ago" />
                                <ActivityItem title="Resume downloaded" desc="Professional_Resume_John_Doe.pdf" time="5h ago" />
                                <ActivityItem title="Account created" desc="Successfully upgraded to Success Pack" time="1d ago" />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

function NavItem({ icon, label, active }) {
    return (
        <a href="#" style={{
            ...styles.navItem,
            background: active ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
            color: active ? 'var(--primary)' : 'var(--gray)',
            fontWeight: active ? '600' : '500'
        }}>
            {icon}
            {label}
        </a>
    )
}

function StatCard({ number, label, color, icon }) {
    return (
        <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: `${color}15`, color }}>
                {icon}
            </div>
            <div>
                <div style={styles.statNumber}>{number}</div>
                <div style={styles.statLabel}>{label}</div>
            </div>
        </div>
    )
}

function ActivityItem({ title, desc, time }) {
    return (
        <div style={styles.activityItem}>
            <div style={styles.activityBlob} />
            <div style={{ flex: 1 }}>
                <div style={styles.activityTitleRow}>
                    <span style={styles.actTitle}>{title}</span>
                    <span style={styles.actTime}>{time}</span>
                </div>
                <div style={styles.actDesc}>{desc}</div>
            </div>
        </div>
    )
}

const styles = {
    layout: {
        display: 'flex',
        minHeight: '100vh',
        background: '#F8FAFF',
        fontFamily: 'var(--font-primary)'
    },
    sidebar: {
        width: '260px',
        background: 'white',
        borderRight: '1px solid var(--gray-border)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
    },
    logo: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '24px',
        fontWeight: '800',
        color: 'var(--dark)',
        marginBottom: '48px',
    },
    logoIcon: {
        width: '32px',
        height: '32px',
        background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
        borderRadius: '8px',
    },
    nav: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    navItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '8px',
        textDecoration: 'none',
        transition: 'all 0.2s',
    },
    main: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        height: '72px',
        background: 'white',
        borderBottom: '1px solid var(--gray-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
    },
    searchBar: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: '#F0F4FF',
        padding: '8px 16px',
        borderRadius: '20px',
        width: '300px',
    },
    searchInput: {
        border: 'none',
        background: 'none',
        outline: 'none',
        width: '100%',
        fontSize: '14px',
    },
    profileArea: {
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
    },
    iconBtn: {
        background: 'none',
        border: 'none',
        color: 'var(--gray)',
        cursor: 'pointer',
    },
    avatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'var(--primary)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
    },
    content: {
        padding: '40px 32px',
        maxWidth: '1000px',
    },
    welcome: {
        fontSize: '32px',
        fontWeight: '800',
        color: 'var(--dark)',
        marginBottom: '8px',
    },
    subtitle: {
        color: 'var(--gray)',
        fontSize: '16px',
        marginBottom: '32px',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '24px',
        marginBottom: '40px',
    },
    statCard: {
        background: 'white',
        padding: '24px',
        borderRadius: '16px',
        border: '1px solid var(--gray-border)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
    },
    statIcon: {
        width: '56px',
        height: '56px',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statNumber: {
        fontSize: '28px',
        fontWeight: '800',
        color: 'var(--dark)',
        lineHeight: '1',
        marginBottom: '4px',
    },
    statLabel: {
        color: 'var(--gray)',
        fontSize: '14px',
        fontWeight: '500',
    },
    recentActivity: {
        marginTop: '24px',
    },
    activityTitle: {
        fontSize: '20px',
        fontWeight: '700',
        marginBottom: '16px',
    },
    activityCard: {
        background: 'white',
        borderRadius: '16px',
        border: '1px solid var(--gray-border)',
        boxShadow: 'var(--shadow-sm)',
        padding: '24px',
    },
    activityList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    activityItem: {
        display: 'flex',
        gap: '16px',
    },
    activityBlob: {
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        background: 'var(--primary)',
        marginTop: '6px',
    },
    activityTitleRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '4px',
    },
    actTitle: {
        fontWeight: '600',
        color: 'var(--dark)',
    },
    actTime: {
        color: 'var(--gray-light)',
        fontSize: '13px',
    },
    actDesc: {
        color: 'var(--gray)',
        fontSize: '14px',
    }
}
