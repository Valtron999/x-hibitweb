import { Navigate, Route, Routes } from "react-router-dom";

import ArtistProfile from "@/pages/ArtistProfile/ArtistProfile";
import AuthLanding from "@/pages/Auth/AuthLanding";
import ForgotPassword from "@/pages/Auth/ForgotPassword";
import Login from "@/pages/Auth/Login";
import ResetPassword from "@/pages/Auth/ResetPassword";
import Signup from "@/pages/Auth/Signup";
import CreatePost from "@/pages/CreatePost/CreatePost";
import Home from "@/pages/Home/Home";
import Onboarding from "@/pages/Onboarding/Onboarding";
import PostDetails from "@/pages/PostDetails/PostDetails";
import Splash from "@/pages/Splash/Splash";
import UserProfile from "@/pages/UserProfile/UserProfile";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/onboarding" element={<Onboarding />} />

      <Route path="/auth" element={<AuthLanding />} />
      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/signup" element={<Signup />} />
      <Route path="/auth/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/reset-password" element={<ResetPassword />} />

      <Route path="/home" element={<Home />} />
      <Route path="/post/:id" element={<PostDetails />} />
      <Route path="/create-post" element={<CreatePost />} />
      <Route path="/profile" element={<ArtistProfile />} />
      <Route path="/user/:id" element={<UserProfile />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
