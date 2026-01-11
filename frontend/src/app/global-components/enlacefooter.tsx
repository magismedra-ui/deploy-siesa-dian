import React from "react";

interface EnlaceFooterProps {
    onClick?: () => void;
    texto: string;
}

export default function EnlaceFooter({ onClick, texto }: EnlaceFooterProps) {
    return (
        <>
            <a style={{cursor: "pointer"}} 
            onClick={onClick} 
            className="white-color">{texto}</a> |
        </>
    );
}
