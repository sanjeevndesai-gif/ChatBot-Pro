import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface MenuItem {
  title: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
}

@Component({
  selector: 'app-horizontalmenu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './horizontalmenu.html',
  styleUrls: ['./horizontalmenu.scss']
})
export class Horizontalmenu {

  mobileMenuOpen: boolean = false;

  // NEW → fix missing variable
  openMobileSubmenus: Set<string> = new Set();

  menu: MenuItem[] = [
    { title: 'Dashboards', icon: 'bi-house-door', route: '/customer-report' },
    {
      title: 'Booked appointments',
      icon: 'bi-calendar2-week',
      children: [
        { title: "Today's appointments", icon: 'bi-pie-chart' },
        {
          title: 'Manual Appointments',
          icon: 'bi-collection',
          children: [
            { title: 'Reschedule appointments', icon: 'bi-people' },
            { title: 'Cancel Appointments', icon: 'bi-x-circle' }
          ]
        }
      ]
    },
    { title: 'Reports', icon: 'bi-file-earmark-bar-graph', route: '/reports' },
    {
      title: 'Help',
      icon: 'bi-info-circle',
      children: [
        { title: 'Chat with us', icon: 'bi-chat' },
        {
          title: 'FAQ',
          icon: 'bi-question-circle',
          children: [
            { title: 'General', icon: 'bi-file-earmark-text' },
            { title: 'Billing', icon: 'bi-wallet2' }
          ]
        },
        { title: 'Call back', icon: 'bi-telephone' }
      ]
    },
    {
      title: 'Settings',
      icon: 'bi-gear',
      children: [
        { title: 'Report', icon: 'bi-flag' },
        { title: 'Message settings', icon: 'bi-envelope' },
        { title: 'Plan', icon: 'bi-card-list' }
      ]
    }
  ];

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  toggleMobileSubmenu(path: string) {
    if (this.openMobileSubmenus.has(path)) {
      this.openMobileSubmenus.delete(path);
    } else {
      this.openMobileSubmenus.add(path);
    }
  }

  isMobileSubmenuOpen(path: string) {
    return this.openMobileSubmenus.has(path);
  }
}
