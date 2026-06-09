import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, addDoc, serverTimestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, sendEmailVerification, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Firebase Configuration
const firebaseConfig = {
  projectId: "medisphere-clinic-ab15",
  appId: "1:482417641346:web:15d761adcea6069a38f19b",
  storageBucket: "medisphere-clinic-ab15.firebasestorage.app",
  apiKey: "AIzaSyDmvpWfZnMJNVpqE5movmTPbDhtayQbsPM",
  authDomain: "medisphere-clinic-ab15.firebaseapp.com",
  messagingSenderId: "482417641346",
  projectNumber: "482417641346",
  version: "2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
    // Helper to escape HTML characters to prevent XSS
    const escapeHtml = (str) => {
        if (str === null || str === undefined) return '';
        return str.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    // Navigation & UI Elements
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const header = document.getElementById('header');

    // Restrict booking date input to today and future dates
    const bookingDateInput = document.querySelector('input[name="date"]');
    if (bookingDateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        let mm = today.getMonth() + 1; // Months are 0-based
        let dd = today.getDate();

        if (mm < 10) mm = '0' + mm;
        if (dd < 10) dd = '0' + dd;

        const formattedToday = `${yyyy}-${mm}-${dd}`;
        bookingDateInput.setAttribute('min', formattedToday);
    }

    // Sticky Navbar on Scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Handle Mobile Menu (Toggle and Icon Sync)
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            const isActive = navLinks.classList.toggle('active');
            const icon = mobileMenuBtn.querySelector('i');
            if (icon) {
                if (isActive) {
                    icon.classList.remove('ri-menu-3-line');
                    icon.classList.add('ri-close-line');
                } else {
                    icon.classList.remove('ri-close-line');
                    icon.classList.add('ri-menu-3-line');
                }
            }
        });
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024 && navLinks && navLinks.classList.contains('active')) {
            if (mobileMenuBtn && !mobileMenuBtn.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('active');
                const icon = mobileMenuBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('ri-close-line');
                    icon.classList.add('ri-menu-3-line');
                }
            }
        }
    });

    // Smooth Scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                
                const headerHeight = header.offsetHeight;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerHeight;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });

                if (window.innerWidth <= 1024 && navLinks) {
                    navLinks.classList.remove('active');
                    const icon = mobileMenuBtn ? mobileMenuBtn.querySelector('i') : null;
                    if (icon) {
                        icon.classList.remove('ri-close-line');
                        icon.classList.add('ri-menu-3-line');
                    }
                }
            }
        });
    });

    // Subtle fade in effect for elements on scroll
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.service-card, .why-card, .doctor-card');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        observer.observe(el);
    });
    
    // Booking Form Submission Handler
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        // Intercept submit button click to validate date and show custom inline error
        const dateInput = bookingForm.querySelector('input[name="date"]');
        const submitBtn = bookingForm.querySelector('button');
        const dateErrorMsg = document.getElementById('date-error-msg');

        if (dateInput) {
            dateInput.addEventListener('input', () => {
                if (dateErrorMsg) {
                    dateErrorMsg.classList.remove('show');
                }
                dateInput.classList.remove('is-invalid');
            });
        }

        if (submitBtn && dateInput) {
            submitBtn.addEventListener('click', (e) => {
                if (dateInput.value) {
                    const selectedDate = new Date(dateInput.value + 'T00:00:00');
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    if (selectedDate < today) {
                        e.preventDefault();
                        if (dateErrorMsg) {
                            dateErrorMsg.classList.add('show');
                        }
                        dateInput.classList.add('is-invalid');
                        dateInput.focus();
                    }
                }
            });
        }

        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = bookingForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = 'Submitting...';
            btn.disabled = true;
            
            try {
                const formData = new FormData(bookingForm);
                
                // Enforce mandatory phone check in JS
                const phone = formData.get('phone');
                if (!phone || !phone.trim()) {
                    btn.disabled = false;
                    btn.innerText = originalText;
                    return;
                }
                
                // Validate selected date to make sure it's not in the past
                const selectedDateStr = formData.get('date');
                if (selectedDateStr) {
                    const selectedDate = new Date(selectedDateStr + 'T00:00:00');
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    if (selectedDate < today) {
                        if (dateErrorMsg) {
                            dateErrorMsg.classList.add('show');
                        }
                        dateInput.classList.add('is-invalid');
                        btn.disabled = false;
                        btn.innerText = originalText;
                        return;
                    }
                }

                const currentUser = auth.currentUser;
                const enquiryData = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    department: formData.get('department'),
                    date: formData.get('date'),
                    symptoms: formData.get('symptoms') || '',
                    userId: currentUser ? currentUser.uid : null,
                    createdAt: serverTimestamp()
                };

                await addDoc(collection(db, "enquiries"), enquiryData);

                btn.innerText = 'Appointment Confirmed ✓';
                btn.style.backgroundColor = '#2CB67D';
                bookingForm.reset();
                if (dateErrorMsg) {
                    dateErrorMsg.classList.remove('show');
                }
                if (dateInput) {
                    dateInput.classList.remove('is-invalid');
                }
                
                // Re-populate if user is logged in
                if (currentUser) {
                    repopulateBookingForm(currentUser);
                }
            } catch (error) {
                console.error("Error saving enquiry: ", error);
                btn.innerText = 'Submission Failed ✗';
                btn.style.backgroundColor = '#E53E3E';
            } finally {
                btn.disabled = false;
                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.style.backgroundColor = '';
                }, 3000);
            }
        });
    }

    // ----------------------------------------------------
    // PATIENT AUTHENTICATION & LOGIN PORTAL LOGIC
    // ----------------------------------------------------
    const loginBtn = document.getElementById('login-btn');
    const authModal = document.getElementById('auth-modal');
    const authModalClose = document.getElementById('auth-modal-close');
    const authForm = document.getElementById('auth-form');
    const googleSigninBtn = document.getElementById('google-signin-btn');
    const authToggleMode = document.getElementById('auth-toggle-mode');
    
    const regNameGroup = document.getElementById('reg-name-group');
    const authModalTitle = document.getElementById('auth-modal-title');
    const authModalSubtitle = document.getElementById('auth-modal-subtitle');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authModeSwitchText = document.getElementById('auth-mode-switch-text');

    let isSignUpMode = false;

    // Toggle Modal
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            authModal.classList.add('active');
        });
    }

    if (authModalClose) {
        authModalClose.addEventListener('click', () => {
            authModal.classList.remove('active');
            resetAuthForm();
        });
    }

    // Close modal when clicking background overlay
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                authModal.classList.remove('active');
                resetAuthForm();
            }
        });
    }

    function resetAuthForm() {
        authForm.reset();
        isSignUpMode = false;
        regNameGroup.style.display = 'none';
        authModalTitle.innerText = 'Welcome Back';
        authModalSubtitle.innerText = 'Log in to manage your medical records and appointments.';
        authSubmitBtn.innerText = 'Log In';
        authModeSwitchText.innerHTML = `Don't have an account? <span id="auth-toggle-mode">Sign Up</span>`;
    }

    if (authModeSwitchText) {
        authModeSwitchText.addEventListener('click', () => {
            isSignUpMode = !isSignUpMode;
            if (isSignUpMode) {
                regNameGroup.style.display = 'block';
                document.getElementById('reg-name').required = true;
                authModalTitle.innerText = 'Create Account';
                authModalSubtitle.innerText = 'Register with Medisphere to manage your profile.';
                authSubmitBtn.innerText = 'Sign Up';
                authModeSwitchText.innerHTML = `Already have an account? <span id="auth-toggle-mode">Log In</span>`;
            } else {
                regNameGroup.style.display = 'none';
                document.getElementById('reg-name').required = false;
                authModalTitle.innerText = 'Welcome Back';
                authModalSubtitle.innerText = 'Log in to manage your medical records and appointments.';
                authSubmitBtn.innerText = 'Log In';
                authModeSwitchText.innerHTML = `Don't have an account? <span id="auth-toggle-mode">Sign Up</span>`;
            }
        });
    }

    // Submit Email/Password credentials
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            const originalText = authSubmitBtn.innerText;
            authSubmitBtn.innerText = 'Processing...';
            authSubmitBtn.disabled = true;

            try {
                if (isSignUpMode) {
                    const fullName = document.getElementById('reg-name').value;
                    const credential = await createUserWithEmailAndPassword(auth, email, password);
                    const user = credential.user;
                    
                    // Send Email Verification for first time signup
                    await sendEmailVerification(user);
                    
                    // Store extra user metadata in Firestore
                    await setDoc(doc(db, "users", user.uid), {
                        name: fullName,
                        email: email,
                        createdAt: serverTimestamp()
                    });
                    
                    alert("Account created successfully! A secure verification link has been sent to your email. Please check your inbox and verify your email address.");
                } else {
                    await signInWithEmailAndPassword(auth, email, password);
                }
                authModal.classList.remove('active');
                resetAuthForm();
            } catch (error) {
                console.error("Auth error: ", error);
                alert(error.message);
            } finally {
                authSubmitBtn.disabled = false;
                authSubmitBtn.innerText = originalText;
            }
        });
    }

    // Google Sign-In Trigger
    if (googleSigninBtn) {
        googleSigninBtn.addEventListener('click', async () => {
            const provider = new GoogleAuthProvider();
            try {
                const result = await signInWithPopup(auth, provider);
                const user = result.user;

                // Sync Google profile details into database if not yet present
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);
                if (!userDoc.exists()) {
                    await setDoc(userDocRef, {
                        name: user.displayName || 'Google User',
                        email: user.email,
                        createdAt: serverTimestamp()
                    });
                }

                authModal.classList.remove('active');
                resetAuthForm();
            } catch (error) {
                console.error("Google Auth error: ", error);
                alert(error.message);
            }
        });
    }

    // Repopulate form utility
    async function repopulateBookingForm(user) {
        if (!bookingForm) return;
        const nameField = bookingForm.querySelector('input[name="name"]');
        const emailField = bookingForm.querySelector('input[name="email"]');
        const phoneField = bookingForm.querySelector('input[name="phone"]');
        
        if (emailField) emailField.value = user.email || '';
        
        let userName = user.displayName;
        let userPhone = '';
        
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                userName = userData.name || userName;
                userPhone = userData.phone || '';
            }
        } catch (err) {
            console.error("Error fetching user doc for repopulating: ", err);
        }
        
        if (nameField) nameField.value = userName || '';
        if (phoneField && userPhone) phoneField.value = userPhone;
    }

    // Clear form utility
    function clearBookingForm() {
        if (!bookingForm) return;
        const nameField = bookingForm.querySelector('input[name="name"]');
        const emailField = bookingForm.querySelector('input[name="email"]');
        const phoneField = bookingForm.querySelector('input[name="phone"]');
        if (nameField) nameField.value = '';
        if (emailField) emailField.value = '';
        if (phoneField) phoneField.value = '';
    }

    // Observe Auth State & Update Header/Form state
    onAuthStateChanged(auth, async (user) => {
        const profileContainer = document.getElementById('profile-container');
        const mobileProfileItem = document.getElementById('mobile-profile-item');
        
        if (user) {
            // User is logged in
            if (loginBtn) loginBtn.style.display = 'none';
            
            let displayName = user.displayName || 'Patient';
            const photoURL = user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';

            if (!user.displayName) {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    displayName = userDoc.data().name || displayName;
                }
            }

            // --- 1. Populate Desktop Header Profile Badge ---
            if (profileContainer) {
                profileContainer.style.display = 'block';

                let verificationStatusHtml = '';
                if (!user.emailVerified) {
                    verificationStatusHtml = `
                        <div class="profile-menu-item" id="resend-verification-btn" style="color: #DD6B20; font-weight: 600; border-bottom: 1px solid #F1F5F9;">
                            <i class="ri-alert-line"></i> Verify Email
                        </div>
                    `;
                }

                profileContainer.innerHTML = `
                    <div class="profile-dropdown" id="profile-dropdown">
                        <div class="profile-trigger" id="profile-trigger">
                            <img src="${photoURL}" alt="${escapeHtml(displayName)}">
                            <span>${escapeHtml(displayName)}</span>${!user.emailVerified ? ' ⚠️' : ''}
                            <i class="ri-arrow-down-s-line"></i>
                        </div>
                        <div class="profile-menu">
                            ${verificationStatusHtml}
                            <div class="profile-menu-item" id="desktop-profile-btn">
                                <i class="ri-user-line"></i> My Profile
                            </div>
                            <div class="profile-menu-item" id="desktop-appointments-btn">
                                <i class="ri-file-list-line"></i> My Appointments
                            </div>
                            <div class="profile-menu-item signout-item" id="signout-btn">
                                <i class="ri-logout-box-r-line"></i> Sign Out
                            </div>
                        </div>
                    </div>
                `;

                // Bind Dropdown Toggle
                const trigger = document.getElementById('profile-trigger');
                const dropdown = document.getElementById('profile-dropdown');
                if (trigger && dropdown) {
                    trigger.addEventListener('click', (e) => {
                        e.stopPropagation();
                        dropdown.classList.toggle('active');
                    });
                    
                    document.addEventListener('click', () => {
                        dropdown.classList.remove('active');
                    });
                }

                // Bind Desktop Profile Button Click
                const desktopProfileBtn = document.getElementById('desktop-profile-btn');
                if (desktopProfileBtn) {
                    desktopProfileBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        dropdown.classList.remove('active');
                        openProfileModal();
                    });
                }

                // Bind Desktop Appointments Button Click
                const desktopAppsBtn = document.getElementById('desktop-appointments-btn');
                if (desktopAppsBtn) {
                    desktopAppsBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        dropdown.classList.remove('active');
                        openAppointmentsModal();
                    });
                }

                // Bind Resend Verification button if unverified
                const resendBtn = document.getElementById('resend-verification-btn');
                if (resendBtn) {
                    resendBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        try {
                            await sendEmailVerification(user);
                            alert("Verification email sent! Please check your inbox.");
                        } catch (err) {
                            console.error(err);
                            alert(err.message);
                        }
                    });
                }

                // Bind Sign-Out button
                const signoutBtn = document.getElementById('signout-btn');
                if (signoutBtn) {
                    signoutBtn.addEventListener('click', () => {
                        signOut(auth);
                    });
                }
            }

            // --- 2. Populate Mobile Collapsable Menu Profile Trigger ---
            if (mobileProfileItem) {
                mobileProfileItem.innerHTML = `
                    <div class="mobile-profile-header">
                        <img src="${photoURL}" alt="${escapeHtml(displayName)}">
                        <div>
                            <h4>${escapeHtml(displayName)} ${!user.emailVerified ? '⚠️' : ''}</h4>
                            <p>${escapeHtml(user.email)}</p>
                        </div>
                    </div>
                    <ul class="mobile-profile-links">
                        ${!user.emailVerified ? `
                        <li>
                            <a href="#" id="mobile-resend-verification-btn" style="color: #DD6B20; font-weight: 600;">
                                <i class="ri-alert-line"></i> Verify Email
                            </a>
                        </li>` : ''}
                        <li><a href="#" id="mobile-profile-btn"><i class="ri-user-line"></i> My Profile</a></li>
                        <li><a href="#" id="mobile-appointments-btn"><i class="ri-file-list-line"></i> My Appointments</a></li>
                        <li><a href="#" id="mobile-signout-btn" class="signout-text"><i class="ri-logout-box-r-line"></i> Sign Out</a></li>
                    </ul>
                `;
                mobileProfileItem.style.display = 'block';

                // Bind Mobile Profile Click
                const mobileProfileBtn = document.getElementById('mobile-profile-btn');
                if (mobileProfileBtn) {
                    mobileProfileBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (navLinks) navLinks.classList.remove('active');
                        const navIcon = mobileMenuBtn ? mobileMenuBtn.querySelector('i') : null;
                        if (navIcon) {
                            navIcon.classList.remove('ri-close-line');
                            navIcon.classList.add('ri-menu-3-line');
                        }
                        openProfileModal();
                    });
                }

                // Bind Mobile Appointments Click
                const mobileAppsBtn = document.getElementById('mobile-appointments-btn');
                if (mobileAppsBtn) {
                    mobileAppsBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (navLinks) navLinks.classList.remove('active');
                        const navIcon = mobileMenuBtn ? mobileMenuBtn.querySelector('i') : null;
                        if (navIcon) {
                            navIcon.classList.remove('ri-close-line');
                            navIcon.classList.add('ri-menu-3-line');
                        }
                        openAppointmentsModal();
                    });
                }

                // Bind Mobile Sign Out
                const mobileSignoutBtn = document.getElementById('mobile-signout-btn');
                if (mobileSignoutBtn) {
                    mobileSignoutBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        signOut(auth);
                    });
                }

                // Bind Mobile Resend Verification
                const mobileResendBtn = document.getElementById('mobile-resend-verification-btn');
                if (mobileResendBtn) {
                    mobileResendBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        try {
                            await sendEmailVerification(user);
                            alert("Verification email sent! Please check your inbox.");
                        } catch (err) {
                            console.error(err);
                            alert(err.message);
                        }
                    });
                }
            }

            // Pre-fill booking form fields
            repopulateBookingForm(user);

        } else {
            // User is logged out
            if (loginBtn) loginBtn.style.display = 'block';
            
            if (profileContainer) {
                profileContainer.style.display = 'none';
                profileContainer.innerHTML = '';
            }

            if (mobileProfileItem) {
                mobileProfileItem.style.display = 'none';
                mobileProfileItem.innerHTML = '';
            }

            // Clear booking form fields
            clearBookingForm();
        }
    });

    // ----------------------------------------------------
    // PATIENT PROFILE EDIT MODAL LOGIC
    // ----------------------------------------------------
    const profileModal = document.getElementById('profile-modal');
    const profileModalClose = document.getElementById('profile-modal-close');
    const profileForm = document.getElementById('profile-form');

    // Open Profile Modal (Load values from Firestore)
    async function openProfileModal() {
        const user = auth.currentUser;
        if (!user) return;
        
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            
            // Set default/Auth values first
            document.getElementById('profile-name').value = user.displayName || '';
            document.getElementById('profile-phone').value = '';
            document.getElementById('profile-dob').value = '';
            document.getElementById('profile-sex').value = '';
            document.getElementById('profile-blood').value = '';
            document.getElementById('profile-weight').value = '';
            document.getElementById('profile-height').value = '';
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.name) document.getElementById('profile-name').value = userData.name;
                if (userData.phone) document.getElementById('profile-phone').value = userData.phone;
                if (userData.dob) document.getElementById('profile-dob').value = userData.dob;
                if (userData.sex) document.getElementById('profile-sex').value = userData.sex;
                if (userData.blood) document.getElementById('profile-blood').value = userData.blood;
                if (userData.weight) document.getElementById('profile-weight').value = userData.weight;
                if (userData.height) document.getElementById('profile-height').value = userData.height;
            }
            
            profileModal.classList.add('active');
        } catch (err) {
            console.error("Error loading profile details: ", err);
            alert("Failed to retrieve profile details. Please try again.");
        }
    }

    // Close Profile Modal
    if (profileModalClose) {
        profileModalClose.addEventListener('click', () => {
            profileModal.classList.remove('active');
        });
    }
    if (profileModal) {
        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) {
                profileModal.classList.remove('active');
            }
        });
    }

    // Submit/Save Profile updates
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = auth.currentUser;
            if (!user) return;
            
            const submitBtn = document.getElementById('profile-submit-btn');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = 'Saving Changes...';
            submitBtn.disabled = true;
            
            const newName = document.getElementById('profile-name').value;
            const newPhone = document.getElementById('profile-phone').value;
            const newDob = document.getElementById('profile-dob').value;
            const newSex = document.getElementById('profile-sex').value;
            const newBlood = document.getElementById('profile-blood').value;
            const newWeight = parseFloat(document.getElementById('profile-weight').value) || null;
            const newHeight = parseFloat(document.getElementById('profile-height').value) || null;
            
            try {
                // 1. Update Firebase Auth displayName
                await updateProfile(user, { displayName: newName });
                
                // 2. Update Firestore user doc
                const userDocRef = doc(db, "users", user.uid);
                await setDoc(userDocRef, {
                    name: newName,
                    phone: newPhone,
                    dob: newDob,
                    sex: newSex,
                    blood: newBlood,
                    weight: newWeight,
                    height: newHeight,
                    updatedAt: serverTimestamp()
                }, { merge: true });
                
                // 3. Update UI text items in real-time
                updateUINames(newName, user.emailVerified);
                
                // Pre-fill booking form with new name
                const nameField = bookingForm ? bookingForm.querySelector('input[name="name"]') : null;
                if (nameField) nameField.value = newName;
                
                alert("Profile updated successfully!");
                profileModal.classList.remove('active');
            } catch (err) {
                console.error("Error updating profile: ", err);
                alert("Failed to update profile: " + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            }
        });
    }

    // Sync UI elements after edit
    function updateUINames(newName, emailVerified) {
        // Desktop Trigger Name
        const desktopTriggerSpan = document.querySelector('#profile-trigger span');
        if (desktopTriggerSpan) {
            desktopTriggerSpan.innerHTML = `${escapeHtml(newName)}${!emailVerified ? ' ⚠️' : ''}`;
        }
        
        // Mobile Trigger Name
        const mobileHeaderH4 = document.querySelector('.mobile-profile-header h4');
        if (mobileHeaderH4) {
            mobileHeaderH4.innerHTML = `${escapeHtml(newName)} ${!emailVerified ? '⚠️' : ''}`;
        }
    }

    // ----------------------------------------------------
    // PATIENT APPOINTMENTS VIEW MODAL LOGIC
    // ----------------------------------------------------
    const appointmentsModal = document.getElementById('appointments-modal');
    const appointmentsModalClose = document.getElementById('appointments-modal-close');
    const appointmentsListContainer = document.getElementById('appointments-list-container');

    // Open Appointments Modal & Fetch from Firestore
    async function openAppointmentsModal() {
        const user = auth.currentUser;
        if (!user) return;

        const statsSummary = document.getElementById('appointments-stats-summary');
        if (statsSummary) {
            statsSummary.style.display = 'none';
            statsSummary.innerHTML = '';
        }

        // Show loading state first
        appointmentsListContainer.innerHTML = `
            <div class="appointments-loading">
                <i class="ri-loader-4-line spin-icon"></i> Loading appointments...
            </div>
        `;
        appointmentsModal.classList.add('active');

        try {
            // Query enquiries by patient UID
            const q = query(
                collection(db, "enquiries"), 
                where("userId", "==", user.uid)
            );
            const querySnapshot = await getDocs(q);

            // Store in array for in-memory sorting
            const appointments = [];
            querySnapshot.forEach((doc) => {
                appointments.push({ id: doc.id, ...doc.data() });
            });

            // Sort appointments by createdAt desc in memory (avoids requiring composite index setup)
            appointments.sort((a, b) => {
                const timeA = a.createdAt ? (a.createdAt.seconds || 0) : 0;
                const timeB = b.createdAt ? (b.createdAt.seconds || 0) : 0;
                return timeB - timeA;
            });

            const totalBookings = appointments.length;
            if (statsSummary && totalBookings > 0) {
                statsSummary.innerHTML = `
                    <div class="appointments-stats-badge">
                        <i class="ri-heart-pulse-line"></i>
                        <span>You have completed <strong>${totalBookings}</strong> booking${totalBookings > 1 ? 's' : ''} with Medisphere Clinic.</span>
                    </div>
                `;
                statsSummary.style.display = 'block';
            }

            if (totalBookings === 0) {
                appointmentsListContainer.innerHTML = `
                    <div class="appointments-empty">
                        <i class="ri-calendar-todo-line" style="font-size: 2.5rem; color: var(--text-light); display: block; margin-bottom: 0.5rem;"></i>
                        No appointments booked yet.
                    </div>
                `;
                return;
            }

            let listHtml = '';
            appointments.forEach((item) => {
                // Format dates nicely
                let bookingDateStr = item.date || 'N/A';
                if (bookingDateStr) {
                    try {
                        const parts = bookingDateStr.split('-');
                        if (parts.length === 3) {
                            // Convert YYYY-MM-DD to DD/MM/YYYY
                            bookingDateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
                        }
                    } catch (e) {}
                }

                let symptomHtml = '';
                if (item.symptoms) {
                    symptomHtml = `
                        <div class="appointment-symptoms-box">
                            <strong>Symptoms/Notes:</strong> ${escapeHtml(item.symptoms)}
                        </div>
                    `;
                }

                listHtml += `
                    <div class="appointment-item-card">
                        <div class="appointment-item-header">
                            <span class="appointment-dept-badge">${escapeHtml(item.department) || 'General'}</span>
                            <span class="appointment-date-badge">
                                <i class="ri-calendar-event-line"></i> ${escapeHtml(bookingDateStr)}
                            </span>
                        </div>
                        <div class="appointment-item-details">
                            <div class="appointment-detail-row">
                                <span class="appointment-detail-label">Patient:</span>
                                <span class="appointment-detail-value">${escapeHtml(item.name)}</span>
                            </div>
                            <div class="appointment-detail-row">
                                <span class="appointment-detail-label">Email:</span>
                                <span class="appointment-detail-value">${escapeHtml(item.email)}</span>
                            </div>
                            <div class="appointment-detail-row">
                                <span class="appointment-detail-label">Phone:</span>
                                <span class="appointment-detail-value">${escapeHtml(item.phone) || 'N/A'}</span>
                            </div>
                            ${symptomHtml}
                        </div>
                    </div>
                `;>
                `;
            });

            appointmentsListContainer.innerHTML = listHtml;
        } catch (err) {
            console.error("Error loading appointments: ", err);
            if (statsSummary) statsSummary.style.display = 'none';
            appointmentsListContainer.innerHTML = `
                <div class="appointments-empty" style="color: #E53E3E;">
                    <i class="ri-error-warning-line" style="font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
                    Failed to load appointments. Please check connection and try again.
                </div>
            `;
        }
    }

    // Close Appointments Modal
    if (appointmentsModalClose) {
        appointmentsModalClose.addEventListener('click', () => {
            appointmentsModal.classList.remove('active');
        });
    }
    if (appointmentsModal) {
        appointmentsModal.addEventListener('click', (e) => {
            if (e.target === appointmentsModal) {
                appointmentsModal.classList.remove('active');
            }
        });
    }

    // ----------------------------------------------------
    // MEDICAL SHOP CONTROLLER & CART MANAGEMENT LOGIC
    // ----------------------------------------------------
    const productsCatalog = [
      {
        id: 1,
        category: "supplements",
        title: "Immune Defense Vitamin C",
        price: 1999,
        rating: 4.5,
        img: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: 2,
        category: "devices",
        title: "Smart Blood Pressure Monitor",
        price: 6499,
        rating: 5,
        img: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: 3,
        category: "essentials",
        title: "Premium First Aid Kit",
        price: 2899,
        rating: 4.5,
        img: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: 4,
        category: "nutrition",
        title: "Organic Plant Protein",
        price: 3799,
        rating: 5,
        img: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: 5,
        category: "supplements",
        title: "Daily Multi-Vitamin Elite",
        price: 1499,
        rating: 4.5,
        img: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: 6,
        category: "devices",
        title: "Advanced Pulse Oximeter",
        price: 1299,
        rating: 5,
        img: "assets/img/pulse_oximeter.png"
      },
      {
        id: 7,
        category: "devices",
        title: "Infrared Forehead Thermometer",
        price: 2499,
        rating: 4.5,
        img: "assets/img/forehead_thermometer.png"
      },
      {
        id: 8,
        category: "supplements",
        title: "Pure Omega-3 Fish Oil",
        price: 1899,
        rating: 5,
        img: "assets/img/omega3_fish_oil.png"
      },
      {
        id: 9,
        category: "devices",
        title: "Smart Body Fat Scale",
        price: 3499,
        rating: 4.5,
        img: "assets/img/smart_body_scale.png"
      },
      {
        id: 10,
        category: "essentials",
        title: "KN95 Protective Face Masks (50 Pack)",
        price: 1499,
        rating: 4.5,
        img: "https://images.unsplash.com/photo-1584634731339-252c581abfc5?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: 11,
        category: "nutrition",
        title: "Electrolyte Hydration Mix",
        price: 999,
        rating: 4.5,
        img: "assets/img/electrolyte_mix.png"
      },
      {
        id: 12,
        category: "supplements",
        title: "Herbal Sleep Support (Melatonin)",
        price: 1299,
        rating: 5,
        img: "assets/img/sleep_melatonin.png"
      }
    ];

    // Detailed Cart State Model: cart = [{ id: 1, quantity: 2 }, ...]
    let cart = JSON.parse(localStorage.getItem('medisphere_cart')) || [];
    let appliedPromo = localStorage.getItem('medisphere_applied_promo') || ""; // e.g. "MEDISPHERE15", "WELCOME10"
    let promoDiscountPercent = 0;

    // Verify applied promo code percentage
    if (appliedPromo === "MEDISPHERE15") {
        promoDiscountPercent = 15;
    } else if (appliedPromo === "WELCOME10") {
        promoDiscountPercent = 10;
    }

    const cartBadge = document.getElementById('cart-badge');
    const cartBtn = document.getElementById('cart-btn');

    // Cart Modal Elements
    const cartModal = document.getElementById('cart-modal');
    const cartModalClose = document.getElementById('cart-modal-close');
    const cartContentWrapper = document.getElementById('cart-content-wrapper');
    const cartItemsList = document.getElementById('cart-items-list');
    const cartEmptyState = document.getElementById('cart-empty-state');
    const cartExploreBtn = document.getElementById('cart-explore-btn');

    // Promo Code Elements
    const cartPromoInput = document.getElementById('cart-promo-input');
    const cartPromoApplyBtn = document.getElementById('cart-promo-apply-btn');
    const cartPromoFeedback = document.getElementById('cart-promo-feedback');

    // Cost Calculator elements
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartDiscountRow = document.getElementById('cart-discount-row');
    const cartPromoBadge = document.getElementById('cart-promo-badge');
    const cartDiscount = document.getElementById('cart-discount');
    const cartTax = document.getElementById('cart-tax');
    const cartShipping = document.getElementById('cart-shipping');
    const cartTotal = document.getElementById('cart-total');

    // Checkout Element
    const cartCheckoutBtn = document.getElementById('cart-checkout-btn');

    function updateCartUI(animate = false) {
        if (!cartBadge) return;
        
        // Calculate total items
        const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartBadge.innerText = cartCount;

        if (cartCount > 0) {
            cartBadge.style.opacity = '1';
            cartBadge.style.transform = 'scale(1)';
            if (animate) {
                cartBadge.style.animation = 'none';
                cartBadge.offsetHeight; // trigger reflow
                cartBadge.style.animation = 'cart-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            }
        } else {
            cartBadge.style.opacity = '0';
            cartBadge.style.transform = 'scale(0)';
        }
    }

    updateCartUI();

    // Bind Add to Cart action dynamically
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('product-add')) {
            const btn = e.target;
            const originalText = btn.innerText;

            // Find product from productsCatalog based on title on the card
            const card = btn.closest('.product-card');
            if (!card) return;
            const titleElement = card.querySelector('.product-title');
            if (!titleElement) return;
            const title = titleElement.innerText.trim();

            const product = productsCatalog.find(p => p.title === title);
            if (!product) return;

            btn.innerText = 'Added ✓';
            btn.style.backgroundColor = 'var(--accent-green)';
            btn.style.color = 'var(--bg-white)';
            btn.disabled = true;

            // Update detailed Cart State
            const existingIndex = cart.findIndex(item => item.id === product.id);
            if (existingIndex > -1) {
                cart[existingIndex].quantity += 1;
            } else {
                cart.push({ id: product.id, quantity: 1 });
            }

            localStorage.setItem('medisphere_cart', JSON.stringify(cart));
            updateCartUI(true);

            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.backgroundColor = '';
                btn.style.color = '';
                btn.disabled = false;
            }, 1000);
        }
    });

    // Cart Modal Opening / Closing Lifecycle
    if (cartBtn && cartModal) {
        cartBtn.addEventListener('click', () => {
            cartModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            renderCartModal();
        });
    }

    function closeCartModal() {
        if (cartModal) {
            cartModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    if (cartModalClose) {
        cartModalClose.addEventListener('click', closeCartModal);
    }

    if (cartModal) {
        cartModal.addEventListener('click', (e) => {
            if (e.target === cartModal) {
                closeCartModal();
            }
        });
    }

    if (cartExploreBtn) {
        cartExploreBtn.addEventListener('click', () => {
            closeCartModal();
            // Open full shop modal or scroll to the shop section
            const viewShopBtn = document.getElementById('view-shop-btn');
            if (viewShopBtn) {
                viewShopBtn.click();
            } else {
                const shopSection = document.getElementById('shop');
                if (shopSection) {
                    shopSection.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    }

    // Apply Promo Code Handler
    if (cartPromoApplyBtn) {
        cartPromoApplyBtn.addEventListener('click', () => {
            if (!cartPromoInput || !cartPromoFeedback) return;
            const code = cartPromoInput.value.toUpperCase().trim();

            if (code === "MEDISPHERE15") {
                appliedPromo = "MEDISPHERE15";
                promoDiscountPercent = 15;
                localStorage.setItem('medisphere_applied_promo', "MEDISPHERE15");
                
                cartPromoFeedback.className = "promo-feedback success";
                cartPromoFeedback.innerText = "Promo code MEDISPHERE15 applied! (15% Off)";
                renderCartModal(false); // recalculate costs
            } else if (code === "WELCOME10") {
                appliedPromo = "WELCOME10";
                promoDiscountPercent = 10;
                localStorage.setItem('medisphere_applied_promo', "WELCOME10");
                
                cartPromoFeedback.className = "promo-feedback success";
                cartPromoFeedback.innerText = "Promo code WELCOME10 applied! (10% Off)";
                renderCartModal(false); // recalculate costs
            } else if (code === "") {
                cartPromoFeedback.className = "promo-feedback error";
                cartPromoFeedback.innerText = "Please enter a promo code.";
            } else {
                cartPromoFeedback.className = "promo-feedback error";
                cartPromoFeedback.innerText = "Invalid promo code. Try MEDISPHERE15 or WELCOME10.";
            }
        });
    }

    // Incrementor, Decrementor & Trash click delegation inside Cart Modal
    if (cartItemsList) {
        cartItemsList.addEventListener('click', (e) => {
            const btn = e.target.closest('.cart-item-qty-btn, .cart-item-remove-btn');
            if (!btn) return;

            const row = btn.closest('.cart-item-row');
            if (!row) return;

            const productId = parseInt(row.getAttribute('data-id'));
            const cartIndex = cart.findIndex(item => item.id === productId);
            if (cartIndex === -1) return;

            if (btn.classList.contains('increment')) {
                cart[cartIndex].quantity += 1;
                localStorage.setItem('medisphere_cart', JSON.stringify(cart));
                updateCartUI();
                renderCartModal(); // refresh rendering
            } else if (btn.classList.contains('decrement')) {
                if (cart[cartIndex].quantity > 1) {
                    cart[cartIndex].quantity -= 1;
                    localStorage.setItem('medisphere_cart', JSON.stringify(cart));
                } else {
                    // Animate row removal before deleting
                    row.classList.add('removing');
                    setTimeout(() => {
                        cart.splice(cartIndex, 1);
                        localStorage.setItem('medisphere_cart', JSON.stringify(cart));
                        updateCartUI();
                        renderCartModal(true); // reload list entirely
                    }, 300);
                    return;
                }
                updateCartUI();
                renderCartModal();
            } else if (btn.classList.contains('cart-item-remove-btn')) {
                // Animate row removal before deleting
                row.classList.add('removing');
                setTimeout(() => {
                    cart.splice(cartIndex, 1);
                    localStorage.setItem('medisphere_cart', JSON.stringify(cart));
                    updateCartUI();
                    renderCartModal(true);
                }, 300);
            }
        });
    }

    // Dynamic Summary calculations & Rendering inside Modal
    function renderCartModal(reloadList = true) {
        if (!cartContentWrapper || !cartEmptyState) return;

        if (cart.length === 0) {
            cartContentWrapper.style.display = 'none';
            cartEmptyState.style.display = 'flex';
            return;
        }

        cartContentWrapper.style.display = 'flex';
        cartEmptyState.style.display = 'none';

        // 1. Render Item List rows if reloadList is true (avoids rebuilding the DOM on basic inputs)
        if (reloadList && cartItemsList) {
            cartItemsList.innerHTML = cart.map(item => {
                const product = productsCatalog.find(p => p.id === item.id);
                if (!product) return '';

                const rowSubtotal = product.price * item.quantity;
                return `
                    <div class="cart-item-row" data-id="${product.id}">
                        <img src="${product.img}" alt="${product.title}">
                        <div class="cart-item-info">
                            <h4 class="cart-item-title">${product.title}</h4>
                            <span class="cart-item-cat">${product.category}</span>
                            <span class="cart-item-price">₹${product.price.toLocaleString('en-IN')}</span>
                        </div>
                        <div class="cart-item-qty-controls">
                            <button class="cart-item-qty-btn decrement"><i class="ri-subtract-line"></i></button>
                            <span class="cart-item-qty-val">${item.quantity}</span>
                            <button class="cart-item-qty-btn increment"><i class="ri-add-line"></i></button>
                        </div>
                        <div class="cart-item-subtotal">₹${rowSubtotal.toLocaleString('en-IN')}</div>
                        <button class="cart-item-remove-btn"><i class="ri-delete-bin-line"></i></button>
                    </div>
                `;
            }).join('');
        }

        // 2. Perform dynamic e-commerce cost calculations
        const subtotalSum = cart.reduce((sum, item) => {
            const product = productsCatalog.find(p => p.id === item.id);
            return sum + (product ? product.price * item.quantity : 0);
        }, 0);

        const discountAmt = Math.round(subtotalSum * (promoDiscountPercent / 100));
        const taxableAmt = subtotalSum - discountAmt;
        const taxAmt = Math.round(taxableAmt * 0.18); // 18% standard healthcare GST

        // Incentivize above ₹2,000 to get free shipping
        const shippingFee = (taxableAmt >= 2000 || taxableAmt === 0) ? 0 : 150;
        const grandTotalSum = taxableAmt + taxAmt + shippingFee;

        // 3. Update summary UI text elements
        if (cartSubtotal) cartSubtotal.innerText = `₹${subtotalSum.toLocaleString('en-IN')}`;
        
        if (promoDiscountPercent > 0) {
            if (cartDiscountRow) cartDiscountRow.style.display = 'flex';
            if (cartPromoBadge) cartPromoBadge.innerText = `${appliedPromo} (${promoDiscountPercent}%)`;
            if (cartDiscount) cartDiscount.innerText = `-₹${discountAmt.toLocaleString('en-IN')}`;
        } else {
            if (cartDiscountRow) cartDiscountRow.style.display = 'none';
        }

        if (cartTax) cartTax.innerText = `₹${taxAmt.toLocaleString('en-IN')}`;
        
        if (cartShipping) {
            if (shippingFee === 0) {
                cartShipping.innerHTML = `<span style="color: var(--accent-green); font-weight: 600;">FREE</span>`;
            } else {
                cartShipping.innerText = `₹${shippingFee.toLocaleString('en-IN')}`;
            }
        }

        if (cartTotal) cartTotal.innerText = `₹${grandTotalSum.toLocaleString('en-IN')}`;

        // 4. Update Promo input display if a code is already active
        if (cartPromoInput && appliedPromo && !cartPromoInput.value) {
            cartPromoInput.value = appliedPromo;
            if (cartPromoFeedback) {
                cartPromoFeedback.className = "promo-feedback success";
                cartPromoFeedback.innerText = `Promo code ${appliedPromo} active! (${promoDiscountPercent}% Off)`;
            }
        }
    }

    // Checkout Handler with beautiful interactive animations
    if (cartCheckoutBtn) {
        cartCheckoutBtn.addEventListener('click', () => {
            const originalHtml = cartCheckoutBtn.innerHTML;
            cartCheckoutBtn.disabled = true;
            cartCheckoutBtn.innerHTML = `<i class="ri-loader-4-line"></i> <span>Processing Secure Payment...</span>`;

            setTimeout(() => {
                cartCheckoutBtn.innerHTML = `<i class="ri-checkbox-circle-line"></i> <span>Payment Confirmed ✓</span>`;
                cartCheckoutBtn.style.backgroundColor = "var(--accent-green)";

                setTimeout(() => {
                    alert(`Secure checkout successful!\n\nYour premium healthcare items are booked for secure delivery.\n\nThank you for choosing Medisphere Clinic!`);
                    
                    // Clear all cart states
                    cart = [];
                    appliedPromo = "";
                    promoDiscountPercent = 0;
                    localStorage.removeItem('medisphere_cart');
                    localStorage.removeItem('medisphere_applied_promo');

                    if (cartPromoInput) cartPromoInput.value = '';
                    if (cartPromoFeedback) {
                        cartPromoFeedback.innerText = '';
                        cartPromoFeedback.className = '';
                    }

                    // Reset button
                    cartCheckoutBtn.disabled = false;
                    cartCheckoutBtn.innerHTML = originalHtml;
                    cartCheckoutBtn.style.backgroundColor = "";

                    // Sync & Close
                    updateCartUI();
                    closeCartModal();
                }, 1000);
            }, 2500);
        });
    }

    // Shop Modal Elements
    const viewShopBtn = document.getElementById('view-shop-btn');
    const shopModal = document.getElementById('shop-modal');
    const shopModalClose = document.getElementById('shop-modal-close');
    const shopSearch = document.getElementById('shop-search');
    const shopSort = document.getElementById('shop-sort');
    const shopCategoriesContainer = document.getElementById('shop-categories');
    const shopGrid = document.getElementById('shop-modal-grid');
    const shopNoResults = document.getElementById('shop-no-results');

    let activeCategory = "all";
    let searchQuery = "";
    let activeSort = "default";

    // Open Modal
    if (viewShopBtn && shopModal) {
        viewShopBtn.addEventListener('click', () => {
            shopModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            renderShopProducts();
        });
    }

    // Close Modal
    function closeShopModal() {
        if (shopModal) {
            shopModal.classList.remove('active');
            document.body.style.overflow = '';
            
            if (shopSearch) shopSearch.value = '';
            if (shopSort) shopSort.value = 'default';
            
            activeCategory = "all";
            searchQuery = "";
            activeSort = "default";
            
            if (shopCategoriesContainer) {
                const pills = shopCategoriesContainer.querySelectorAll('.filter-pill');
                pills.forEach(pill => {
                    if (pill.getAttribute('data-category') === 'all') {
                        pill.classList.add('active');
                    } else {
                        pill.classList.remove('active');
                    }
                });
            }
        }
    }

    if (shopModalClose) {
        shopModalClose.addEventListener('click', closeShopModal);
    }

    if (shopModal) {
        shopModal.addEventListener('click', (e) => {
            if (e.target === shopModal) {
                closeShopModal();
            }
        });
    }

    // Handle Search Input
    if (shopSearch) {
        shopSearch.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            renderShopProducts();
        });
    }

    // Handle Category Pills
    if (shopCategoriesContainer) {
        shopCategoriesContainer.addEventListener('click', (e) => {
            const pill = e.target.closest('.filter-pill');
            if (!pill) return;
            
            shopCategoriesContainer.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            
            activeCategory = pill.getAttribute('data-category');
            renderShopProducts();
        });
    }

    // Handle Sorting
    if (shopSort) {
        shopSort.addEventListener('change', (e) => {
            activeSort = e.target.value;
            renderShopProducts();
        });
    }

    // Reactive Renderer
    function renderShopProducts() {
        if (!shopGrid) return;

        let filtered = productsCatalog.filter(p => {
            const matchesCategory = activeCategory === "all" || p.category === activeCategory;
            const matchesSearch = p.title.toLowerCase().includes(searchQuery) || 
                                  p.category.toLowerCase().includes(searchQuery);
            return matchesCategory && matchesSearch;
        });

        if (activeSort === "price-low") {
            filtered.sort((a, b) => a.price - b.price);
        } else if (activeSort === "price-high") {
            filtered.sort((a, b) => b.price - a.price);
        } else if (activeSort === "name-asc") {
            filtered.sort((a, b) => a.title.localeCompare(b.title));
        }

        if (filtered.length === 0) {
            shopGrid.innerHTML = '';
            if (shopNoResults) shopNoResults.style.display = 'flex';
        } else {
            if (shopNoResults) shopNoResults.style.display = 'none';
            
            const html = filtered.map(p => {
                const starsHtml = Array.from({ length: 5 }, (_, i) => {
                    const starVal = i + 1;
                    if (p.rating >= starVal) {
                        return `<i class="ri-star-fill" style="color: #FFC107; font-size: 0.9rem;"></i>`;
                    } else if (p.rating >= starVal - 0.5) {
                        return `<i class="ri-star-half-fill" style="color: #FFC107; font-size: 0.9rem;"></i>`;
                    } else {
                        return `<i class="ri-star-line" style="color: #E2E8F0; font-size: 0.9rem;"></i>`;
                    }
                }).join('');

                return `
                    <div class="product-card">
                        <img src="${p.img}" alt="${p.title}" class="product-img" loading="lazy">
                        <div class="product-details">
                            <span class="product-cat">${p.category}</span>
                            <h3 class="product-title">${p.title}</h3>
                            <div class="product-rating" style="margin-bottom: 0.5rem; display: flex; gap: 0.2rem;">
                                ${starsHtml}
                            </div>
                            <div class="product-price">₹${p.price.toLocaleString('en-IN')}</div>
                            <button class="product-add">Add to Cart</button>
                        </div>
                    </div>
                `;
            }).join('');
            
            shopGrid.innerHTML = html;
        }
    }
});

