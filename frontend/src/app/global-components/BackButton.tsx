'use client'
import { Button } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useRouter } from 'next/navigation'

export default function BackButton() {
	const router = useRouter()

	return (
		<Button
			variant="outlined"
			startIcon={<ArrowBackIcon />}
			onClick={() => router.push('/')}
			sx={{
				borderColor: '#004084',
				color: '#004084',
				'&:hover': {
					borderColor: '#004084',
					backgroundColor: '#f5f5f5',
				},
			}}
		>
			Regresar al Panel Principal
		</Button>
	)
}

