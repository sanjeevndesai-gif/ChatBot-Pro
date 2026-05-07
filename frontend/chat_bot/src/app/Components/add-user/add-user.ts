import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormControl,
  ReactiveFormsModule
} from '@angular/forms';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';


interface UserForm {
  name: FormControl<string>;
  phone: FormControl<string>;
  specialization: FormControl<string>;
  role: FormControl<string>;
}

@Component({
  selector: 'app-add-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-user.html'
})
export class AddUser implements OnInit {

  @Input() userData: any;

  userForm!: FormGroup<UserForm>;
  isSubmitting = false;

  roles = ['Admin', 'Doctor'];

  get isEditMode() {
    return !!this.userData;
  }

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    public activeModal: NgbActiveModal
  ) { }

  ngOnInit(): void {

    this.userForm = this.fb.group<UserForm>({
      name: this.fb.control('', {
        validators: [Validators.required, Validators.minLength(3)],
        nonNullable: true
      }),
      phone: this.fb.control('', {
        validators: [
          Validators.required,
          Validators.pattern('^[0-9]{10}$')
        ],
        nonNullable: true
      }),
      specialization: this.fb.control('', {
        validators: [Validators.required, Validators.minLength(3)],
        nonNullable: true
      }),
      role: this.fb.control('', {
        validators: [Validators.required],
        nonNullable: true
      })
    });

    if (this.isEditMode) {
      this.userForm.patchValue(this.userData);
    }
  }

  get f() {
    return this.userForm.controls;  // ✅ Now fully typed
  }

  allowOnlyNumbers(event: any) {
    const input = event.target.value.replace(/[^0-9]/g, '');
    this.userForm.controls.phone.setValue(input);
  }

  submit() {

    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formData = this.userForm.getRawValue();

    if (this.isEditMode) {

      const payload = {
        ...this.userData,
        ...formData
      };

      this.userService.updateUser(payload).subscribe({
        next: () => {
          this.activeModal.close({
            success: true,
            message: 'User updated successfully ✅'
          });
        },
        error: (err) => {
          alert(err.message);
          this.isSubmitting = false;
        }
      });

    } else {

      this.userService.addUser(formData).subscribe({
        next: () => {
          this.activeModal.close({
            success: true,
            message: 'User added successfully ✅'
          });
        },
        error: (err) => {
          alert(err.message);
          this.isSubmitting = false;
        }
      });

    }
  }



  cancel() {
    this.activeModal.dismiss();
  }
}

