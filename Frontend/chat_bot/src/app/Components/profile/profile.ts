import { Component } from '@angular/core';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class Profile {
  // sample data — replace with your real data or bindings
  user = {
    id:1234,
    fullName: 'John Doe',
    title: 'UX Designer',
    location: 'Vatican City',
    joined: 'Joined April 2021',
    status: 'Active',
    role: 'Developer',
    country: 'USA',
    languages: 'English',
    contact: '(123) 456-7890',
    skype: 'john.doe',
    email: 'john.doe@example.com',
    address: 'Btm layout 2nd stage'
  };
}
