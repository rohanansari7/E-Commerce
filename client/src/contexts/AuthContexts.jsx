import { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";


export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(
        localStorage.getItem("userInfo") ? JSON.parse(localStorage.getItem("userInfo")) : null
    );

    const navigate = useNavigate();

    const login = (userData) =>{
        setUser(userData);
        localStorage.setItem("userInfo", JSON.stringify(userData));
        navigate("/dashboard");
    }

    const logout = () => {  
        setUser(null);
        localStorage.removeItem("userInfo");
        navigate("/login");
    }

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
};

