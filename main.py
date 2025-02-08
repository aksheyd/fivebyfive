# """

# start with 5 cards in row in middle

# """

from random import random
from enum import Enum
from collections import defaultdict
import os


class Suit(Enum):
	HEARTS = 1
	SPADES = 2
	DIAMONDS = 3
	CLUBS = 4


class Number(Enum):
	ACE = 1
	TWO = 2
	THREE = 3
	FOUR = 4
	FIVE = 5
	SIX = 6
	SEVEN = 7
	EIGHT = 8
	NINE = 9
	TEN = 10
	JACK = 11
	QUEEN = 12
	KING = 13


class Card:
	def __init__(self, suit: Suit, number: Number):
		self.suit = suit
		self.number = number

	def __repr__(self):  
		if self.number is None or self.suit is None:
			return "______________"
		return "% s of % s" % (self.number.name, self.suit.name) 


class Deck:
	def __init__(self):
		self.cards = []

		nums = list(Number)
		suits = list(Suit)
		for i in range(0, 13):
			number = nums[i]
			for j in range(0, 4):
				suit = suits[j]
				card = Card(suit, number)
				self.cards.append(card)


class Game:
	def __init__(self):
		self.deck = Deck().cards
		self.grid = [[Card(None, None) for _ in range(0, 5)] for _ in range(0, 5)]

		self.__init5()
		self.play()


	def __fillWholeGrid(self) -> None:
		# ONLY FOR DEBUGGING
		self.deck = Deck().cards
		for x in range(0, 5):
			for y in range(0, 5):
				self.grid[x][y] = self.__getRandomCard()


	def __getRandomCard(self) -> Card:
		return (self.deck.pop(int(random() * 1000 % (len(self.deck)))))


	def __printGrid(self) -> None:
		print("----------------------------------------------------------------------------------")
		print("    0                1                2                3                4")
		for x in range(0, 5):
			print(x, self.grid[x])
		print("---------------------------------------------------------------------------------")


	def __checkBoardFull(self) -> bool:
		for x in range(0, 5):
			for y in range(0, 5):
				curr = self.grid[x][y]
				if curr.number is None or curr.suit is None:
					return False
		return True


	def __retrieveUserCoords(self) -> list[list]:
		text = ("Please provide coordinates for your next move:" + "\n\t\t" +
					"Valid coordinates must be:\n\t\t1. Neighboring at least one card\n\t\t" +
					"2. Within the 5 by 5 grid\n\t\t" +
					"Please format input as your to coordinates from 0 to 4 with one space between\n\t\t" +
					"i.e. 0 1 -> means row 0 and column 1\n")
		raw = input(text)

		try:
			formatted = [int(x) for x in raw.split(' ')]
			if len(formatted) != 2 or any((num > 4 or num < 0) for num in formatted):
				input("Invalid amout of number or number(s), hit Enter to reset")
				return []

			x, y = formatted[0], formatted[1]

			if self.grid[x][y].number and self.grid[x][y].suit:
				input("Can't play on existing card, hit Enter to reset")
				return []

			directions = [(x - 1, y), (x + 1, y), (x, y + 1), (x, y - 1)]
			neighbors = []

			for dir in directions:
				row, col = dir[0], dir[1]
				if (row >= 0 and row < 5 and col >= 0 and col < 5 and
					self.grid[row][col].number and 
					self.grid[row][col].suit):
					neighbors.append([row, col])

			if not neighbors:
				input("No neighboring card(s), hit Enter to reset")
				return []

			return [formatted, neighbors]
		except Exception as e:
			print("Error:", e)
			input("Enter to reset")
			return []
	
	def __retrieveUserPlay(self, type: int) -> str:
		if type == 1:
			raw = input("Higher or Lower?\n\t" + "Type 'higher' or 'lower'\n")
			try:
				formatted = raw.lower()
				if formatted == 'higher' or formatted == 'lower':
					return formatted
				else:
					input("Invalid entry, hit Enter to reset")
					return ""
			except Exception as e:
				input("Error:", e, "\nHit Enter to try again")
				return ""

		elif type == 2:
			raw = input("Inside or Outside?\n\t" + "Type 'inside' or 'outside'\n")
			try:
				formatted = raw.lower()
				if formatted == 'inside' or formatted == 'outside':
					return formatted
				else:
					input("Invalid entry, hit Enter to reset")
					return ""
			except Exception as e:
				input("Error:", e, "\nHit Enter to try again")
				return ""
		elif type == 3:
			raw = input("Same or Different?\n\t" + "Type 'same' or 'different'\n")
			try:
				formatted = raw.lower()
				if formatted == 'same' or formatted == 'different':
					return formatted
				else:
					input("Invalid entry, hit Enter to reset")
					return ""
			except Exception as e:
				input("Error:", e, "\nHit Enter to try again")
				return ""
		elif type == 4:
			input("Invalid entry, hit Enter to reset")
			return ""
	
	def __clearRowCol(self, row: int, col: int) -> None:
		for x in range(0, 5):
			if (self.grid[x][col].number and self.grid[x][col].suit):
				self.deck.append(self.grid[x][col])
				self.grid[x][col] = Card(None, None)
				print("Clearing", self.grid[x][col])

			if (self.grid[row][x].number and self.grid[row][x].suit):
				self.deck.append(self.grid[row][x])
				self.grid[row][x] = Card(None, None)
				print("Clearing", self.grid[row][x])
		
		self.__init5()

	def __init5(self) -> None:
		# init the first 5 cards in middle row
		for i in range(0, 5):
			if self.grid[2][i].number is None and self.grid[2][i].suit is None:
				self.grid[2][i] = self.__getRandomCard()

	def play(self):
		isComplete = self.__checkBoardFull()
		while not isComplete:
			
			# grab user input
			data = None
			while not data:
				os.system("clear")
				self.__printGrid()
				data = self.__retrieveUserCoords()
					
			coords, neighbors = data
			if len(neighbors) == 0 or len(neighbors) > 4:
				print("ERROR CODE 150")
				exit(1)

			play = ""
			while play == "":
				os.system("clear")
				self.__printGrid()
				play = self.__retrieveUserPlay(len(neighbors))
			print()
			
			newCard: Card = self.__getRandomCard()
			print("You pulled:", newCard, "compared to", [self.grid[x][y] for x, y in neighbors])
					
			currCardVal = newCard.number.value
			currCardSuit = newCard.suit.name

			if play == "higher":
				if currCardVal >= self.grid[neighbors[0][0]][neighbors[0][1]].number.value:
					print("Good job! Placing card.")
					self.grid[coords[0]][coords[1]] = newCard
				else:
					print("Nice try :(, cards will be cleared.")
					self.__clearRowCol(coords[0], coords[1])

			elif play == "lower":
				if currCardVal <= self.grid[neighbors[0][0]][neighbors[0][1]].number.value:
					print("Good job! Placing card.")
					self.grid[coords[0]][coords[1]] = newCard
				else:
					print("Nice try :(, cards will be cleared.")
					self.__clearRowCol(coords[0], coords[1])
			
			elif play == "inside":
				nums = [self.grid[n[0]][n[1]].number.value for n in neighbors]
				if len(nums) != 2: print("ERROR CODE 252")
				mn, mx = min(nums), max(nums)
				if mn <= currCardVal <= mx:
					print("Good job! Placing card.")
					self.grid[coords[0]][coords[1]] = newCard
				else:
					print("Nice try :(, cards will be cleared.")
					self.__clearRowCol(coords[0], coords[1])

			elif play == "outside":
				nums = [self.grid[n[0]][n[1]].number.value for n in neighbors]
				if len(nums) != 2: print("ERROR CODE 252")
				mn, mx = min(nums), max(nums)
				if currCardVal <= mn or currCardVal >= mx:
					print("Good job! Placing card.")
					self.grid[coords[0]][coords[1]] = newCard
				else:
					print("Nice try :(, cards will be cleared.")
					self.__clearRowCol(coords[0], coords[1])

			elif play == "same":
				suits = [self.grid[n[0]][n[1]].suit.name for n in neighbors]
				if currCardSuit in suits:
					print("Good job! Placing card.")
					self.grid[coords[0]][coords[1]] = newCard
				else:
					print("Nice try :(, cards will be cleared.")
					self.__clearRowCol(coords[0], coords[1])

			elif play == "different":
				suits = [self.grid[n[0]][n[1]].suit.name for n in neighbors]
				if currCardSuit not in suits:
					print("Good job! Placing card.")
					self.grid[coords[0]][coords[1]] = newCard
				else:
					print("Nice try :(, cards will be cleared.")
					self.__clearRowCol(coords[0], coords[1])

			else:
				print("ERROR CODE 190")
			
			# os.system("clear")
			self.__printGrid()
			input("\nPlease hit Enter to continue.\n")
		

def main():
	def get_input():
		try:
			gamemode = int(input("Choose game mode (1. Solo, 2. With CPU, 3. Quit): "))
		except Exception as e:
			input("Error: " + str(e) + "\n\nHit Enter to try again.")
			return -1
		
		if gamemode == 1:
			Game()
			return 1
		elif gamemode == 2:
			return 1
		elif gamemode == 3:
			exit(1)
		else:
			input("Please select 1 or 2\n\nHit Enter to try again.")
			return -1

	inp = -1
	while inp == -1:
		os.system("clear")
		inp = get_input()

main()

